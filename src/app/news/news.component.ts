import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { FormGroup, FormControl, Validators, FormBuilder, AbstractControl } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ConnectedOverlayPositionChange } from '@angular/cdk/overlay';

@Component({
  templateUrl: './news.component.html',
  styleUrls: [ './news.scss' ]
})
export class NewsComponent implements OnInit {
  private dbName = 'news';
  configuration = this.stateService.configuration;
  newsItems: any[] = [];
  imgUrlPrefix = environment.couchAddress + '/' + '_users' + '/';
  newsPost: FormGroup;

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService

  ) {
    this.createNewsForm();
  }

  createNewsForm() {
    this.newsPost = this.fb.group({
        newMessage: [ '', CustomValidators.required ],
    });
  }

  ngOnInit() {
    this.getMessages();
  }

  getMessages() {
    this.couchService.findAll(this.dbName, findDocuments({ createdOn: this.configuration.code }, 0, [ { 'time': 'desc' } ]))
    .subscribe(newsItems => {
      this.newsItems = newsItems.map((item: any) => {
        const filename = item.user._attachments && Object.keys(item.user._attachments)[0];
        return { ...item, avatar: filename ? this.imgUrlPrefix + item.user._id + '/' + filename : 'assets/image.png' };
      });
    });
  }

  postMessage() {
    this.couchService.updateDocument(this.dbName, {
      message: this.newsPost.controls.newMessage.value,
      time: this.couchService.datePlaceholder,
      createdOn: this.configuration.code,
      parentCode: this.configuration.parentCode,
      user: this.userService.get(),
      viewableBy: 'community'
    }).subscribe(() => {
      this.planetMessageService.showMessage('Thank you for submitting your news');
      this.resetNewsForm(this.newsPost.get('newMessage'));
      this.getMessages();
    });
  }

  resetNewsForm(control: AbstractControl) {
    control.reset('');
    control.markAsPristine();
    control.markAsUntouched();
  }

}
