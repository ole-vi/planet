import { switchMap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { HttpClient } from '@angular/common/http';

@Component({
  templateUrl: './resources-view.component.html',
  styles: [ `
    :host iframe {
      width: 80vw;
      height: 80vh;
      border: none;
    }
  ` ]
})
export class ResourcesViewComponent implements OnInit, OnDestroy {

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private http: HttpClient
  ) { }

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();

  resource = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';
  subscription;

  ngOnInit() {

    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'))))
      .debug('Getting resource id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(resource => this.setResource(resource), error => console.log(error), () => console.log('complete getting resource id'));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getResource(id: string, nationName: string) {
    if (nationName) {
      return this.couchService.post(`nations/_find`,
      { 'selector': { 'name': nationName },
      'fields': [ 'name', 'nationurl' ] })
        .pipe(switchMap(data => {
          const nationUrl = data.docs[0].nationurl;
          if (nationUrl) {
            this.urlPrefix = 'http://' + nationUrl + '/' + this.dbName + '/';
            return this.http.jsonp(this.urlPrefix + id + '?include_docs=true&callback=JSONP_CALLBACK', 'callback');
          }
        }));
    }
    return this.couchService.get('resources/' + id);
  }

  setResource(resource: any) {
    // openWhichFile is used to label which file to start with for HTML resources
    const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
    this.mediaType = resource.mediaType;
    this.contentType = resource._attachments[filename].content_type;
    this.resourceSrc = this.urlPrefix + resource._id + '/' + filename;
    if (this.mediaType === 'pdf' || this.mediaType === 'HTML') {
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
      this.couchSrc = environment.couchAddress + this.dbName + '/' + resource._id + '/' + filename;








































    }
  }

  resourceData(data) {
    const filename = data.openWhichFile || Object.keys(data._attachments)[0];
    this.mediaType = data.mediaType;
    this.contentType = data._attachments[filename].content_type;
    if (!this.mediaType) {
      const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
      this.mediaType = mediaTypes.find((type) => this.contentType.indexOf(type) > -1) || 'other';
    }
    this.resourceSrc = this.urlPrefix + data._id + '/' + filename;
    if (this.mediaType === 'pdf'  || this.mediaType === 'HTML') {
       this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
       this.couchSrc = this.urlPrefix + data._id + '/' + filename;
    }
    return data;
  }

}
