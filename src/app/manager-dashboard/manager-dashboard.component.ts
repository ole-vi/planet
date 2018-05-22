import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findOneDocument } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  template: `
    <div *ngIf="displayDashboard">
      <span *ngIf="planetType !== 'community'">
        <a routerLink="/requests" i18n mat-raised-button>Requests</a>
        <a routerLink="/associated/{{ planetType === 'center' ? 'nation' : 'community' }}"
          i18n mat-raised-button>{{ planetType === 'center' ? 'Nation' : 'Community' }}</a>
      </span>
      <button *ngIf="planetType !== center && showResendConfiguration"
        (click)="resendConfig()" i18n mat-raised-button>Resend Registration Request</button>
      <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
    </div>
    <div class="view-container" *ngIf="displayDashboard && planetType !== 'center'">
      <h3 i18n>{{ planetType === 'community' ? 'Nation' : 'Center' }} List</h3><br />
      <a routerLink="resources" i18n mat-raised-button>List Resources</a>
      <a routerLink="courses" i18n mat-raised-button>List Courses</a>
      <a routerLink="meetups" i18n mat-raised-button>List Meetups</a>
    </div>
    <div>{{message}}</div>
  `
})

export class ManagerDashboardComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.userService.getConfig().planetType;
  showResendConfiguration = false;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
    // Check parent if configuration exists
    this.couchService.post(`communityregistrationrequests/_find`, findOneDocument('name', this.userService.get().name),
      { domain: this.userService.getConfig().parentDomain }).subscribe((data: any) => {
        if (data.docs.length === 0) {
          this.showResendConfiguration = true;
        }
      });
  }

  resendConfig() {
    const { _id, _rev, ...config } = this.userService.getConfig();
    let userDetail: any, userRev;
    this.couchService.get('_users/org.couchdb.user:' + this.userService.get().name)
      .pipe(switchMap((user: any) => {
        // Outer parenthesis allow for object destructuring on existing variables
        ({ _rev: userRev, ...userDetail } = user);
        userDetail.isUserAdmin = false;
        return this.couchService.post('communityregistrationrequests', config, { domain: this.userService.getConfig().parentDomain });
      }), switchMap((res: any) => {
        userDetail.requestId = res.id;
        return this.couchService.post(`_users/_find`,
          { 'selector': { '_id': userDetail._id }, 'fields': [ '_id', '_rev' ] },
          { domain: this.userService.getConfig().parentDomain });
      }), switchMap((user) => {
        if (user.docs[0]) {
          userDetail._rev = user.docs[0]._rev;
        }
        return forkJoin([
          this.couchService.put('_users/org.couchdb.user:' + userDetail.name,
            userDetail, { domain: this.userService.getConfig().parentDomain }),
          this.couchService.put('shelf/org.couchdb.user:' + userDetail.name,
            {}, { domain: this.userService.getConfig().parentDomain })
        ]);
      })).subscribe((res: any) => {
        this.planetMessageService.showMessage('Registration request has been sent successfully.');
        this.showResendConfiguration = false;
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
  }

}
