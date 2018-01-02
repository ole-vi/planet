import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatPaginator, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { MatDialog } from '@angular/material';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Jsonp, Response } from '@angular/http';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'rating' ];
  readonly dbName = 'resources';
  mRating;
  fRating;
  message = '';
  file: any;
  deleteDialog: any;
  nationname = '';

  getRating(sum, timesRated) {
    let rating = 0;
    if (sum > 0 && timesRated > 0) {
      rating = sum / timesRated;
    }
    // Multiply by 20 to convert rating out of 5 to percent for width
    return (rating * 20) + '%';
  }

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private jsonp: Jsonp
  ) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }

  ngAfterViewInit() {
    this.resources.paginator = this.paginator;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getResources() {
    this.couchService
      .get('resources/_all_docs?include_docs=true')
      .subscribe(data => {
        this.resources.data = data.rows.map(res => res.doc);
      }, error => (this.message = 'Error'));
  }

  deleteClick(resource) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteResource(resource),
        type: 'resource',
        displayName: resource.title
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete('resources/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  getNationResources() {
    if (this.route.snapshot.paramMap.get('nationname') !== null) {
      this.couchService.post(`nations/_find`,
      { 'selector': { 'name':  this.route.snapshot.paramMap.get('nationname') },
      'fields': [ 'name', 'nationurl' ] })
        .then(data => {
          this.nationname = this.route.snapshot.paramMap.get('nationname');
          const nationUrl = data.docs[0].nationurl;
          if (nationUrl) {
            this.jsonp.request('http://' + nationUrl + '/resources/_all_docs?include_docs=true&callback=JSONP_CALLBACK&limit=5')
            .subscribe(res => {
              this.resources = res.json().rows.length > 0 ? res.json().rows : [];
            });
          }
        }, error => (this.message = 'Error'));
    }
  }

}
