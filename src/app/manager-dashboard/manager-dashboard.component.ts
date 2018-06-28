import { Component, OnInit, isDevMode } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { debug } from '../debug-operator';
import { SyncService } from '../shared/sync.service';

@Component({
  templateUrl: './manager-dashboard.component.html'
})

export class ManagerDashboardComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.userService.getConfig().planetType;
  showResendConfiguration = false;
  requestStatus = 'loading';
  devMode = isDevMode();
  deleteCommunityDialog: any;
  pushedItems = { course: [], resource: [] };

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private syncService: SyncService
  ) {}

  ngOnInit() {
    if (this.planetType !== 'center') {
      this.checkRequestStatus();
      this.getPushedList();
    }
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
  }

  resendConfig() {
    const { _id, _rev, ...config } = this.userService.getConfig();
    let userDetail: any, userRev;
    this.couchService.get('_users/org.couchdb.user:' + this.userService.get().name)
      .pipe(switchMap((user: any) => {
        // Outer parenthesis allow for object destructuring on existing variables
        ({ _rev: userRev, ...userDetail } = user);
        userDetail.isUserAdmin = false;
        return this.couchService.post('communityregistrationrequests', config, { domain: config.parentDomain });
      }), switchMap((res: any) => {
        userDetail.requestId = res.id;
        return forkJoin([ this.findOnParent('_users', userDetail), this.findOnParent('shelf', userDetail) ]);
      }), switchMap(([ user, shelf ]) => {
        if (user.docs[0]) {
          userDetail._rev = user.docs[0]._rev;
        }
        const obs = [ this.couchService.put('_users/org.couchdb.user:' + userDetail.name, userDetail, { domain: config.parentDomain }) ];
        if (!shelf) {
          obs.push(this.couchService.put('shelf/org.couchdb.user:' + userDetail.name, {}, { domain: config.parentDomain }));
        }
        return forkJoin(obs);
      })).subscribe((res: any) => {
        this.planetMessageService.showMessage('Registration request has been sent successfully.');
        this.showResendConfiguration = false;
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
  }

  checkRequestStatus() {
    this.couchService.post(`communityregistrationrequests/_find`,
      findDocuments({ 'code': this.userService.getConfig().code }, [ 'registrationRequest' ]),
      { domain: this.userService.getConfig().parentDomain }).subscribe(data => {
        if (data.docs.length === 0) {
          this.showResendConfiguration = true;
        }
        this.requestStatus = data.docs[0].registrationRequest;
      }, error => (error));
  }

  // Find on the user or shelf db (which have matching ids)
  findOnParent(db: string, user: any) {
    return this.couchService.post(`${db}/_find`,
      { 'selector': { '_id': user._id }, 'fields': [ '_id', '_rev' ] },
      { domain: this.userService.getConfig().parentDomain });
  }

  deleteCommunity() {
     return () => {
      this.couchService.allDocs('_replicator').pipe(switchMap((docs: any) => {
        const replicators = docs.map(doc => {
          return { _id: doc._id, _rev: doc._rev, _deleted: true };
        });
        return forkJoin([
          this.couchService.delete('shelf/' + this.userService.get()._id + '?rev=' + this.userService.shelf._rev ),
          this.couchService.delete('configurations/' + this.userService.getConfig()._id + '?rev=' + this.userService.getConfig()._rev ),
          this.couchService.delete('_users/' + this.userService.get()._id + '?rev=' + this.userService.get()._rev ),
          this.couchService.delete('_node/nonode@nohost/_config/admins/' + this.userService.get().name, { withCredentials: true }),
          this.couchService.post('_replicator/_bulk_docs', { 'docs': replicators })
        ]);
      })).subscribe((res: any) => {
        this.deleteCommunityDialog.close();
        this.router.navigate([ '/login/configuration' ]);
      }, error => this.planetMessageService.showAlert('An error occurred please try again.'));
    };
  }

  openDeleteCommunityDialog() {
    this.deleteCommunityDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCommunity(),
        changeType: 'delete',
        type: 'community',
        displayName: this.userService.get().name
      }
    });
    // Reset the message when the dialog closes
    this.deleteCommunityDialog.afterClosed().pipe(debug('Closing dialog')).subscribe();
  }

  getPushedList() {
    this.couchService.post(`send_items/_find`,
      findDocuments({ 'sendTo': this.userService.getConfig().name }),
        { domain: this.userService.getConfig().parentDomain })
    .subscribe(data => {
      this.pushedItems = data.docs.reduce((items, item) => {
        items[item.db] = items[item.db] ? items[item.db] : [];
        items[item.db].push(item);
        return items;
      }, {});
    });
  }

  getPushedItem(db: string) {
    const deleteItems = this.pushedItems[db].map(item => ({ _id: item._id, _rev: item._rev, _deleted: true }));
    const itemList = this.pushedItems[db].map(item => item.item);
    const replicators = [ { db, type: 'pull', date: true, items: itemList } ];
    this.syncService.confirmPasswordAndRunReplicators(replicators).pipe(
      switchMap(data => {
        return this.couchService.post('send_items/_bulk_docs', { docs:  deleteItems },
        { domain: this.userService.getConfig().parentDomain });
      })
    ).subscribe(() => this.planetMessageService.showMessage(db[0].toUpperCase() + db.substr(1) + ' are being fetched'));
  }

}
