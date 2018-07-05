import { Component, OnInit, isDevMode } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Router } from '@angular/router';
import { debug } from '../debug-operator';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { SyncService } from '../shared/sync.service';
import { CoursesService } from '../courses/courses.service';

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
  versionLocal: string = this.userService.getConfig().version;
  versionParent = '';
  dialogRef: MatDialogRef<DialogsListComponent>;
  pushedItems = { course: [], resource: [] };
  pin: string;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private router: Router,
    private planetMessageService: PlanetMessageService,
    private dialogsListService: DialogsListService,
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
    } else if (this.userService.getConfig().planetType !== 'center') {
      this.couchService.post(
        'configurations/_find',
        { 'selector': { '_id': 'version' } },
        { domain: this.userService.getConfig().parentDomain }
      ).subscribe(config => {
        this.versionParent = config.docs[0].version;
      });
    }
    this.couchService.get('_node/nonode@nohost/_config/satellite/pin').subscribe((res) => this.pin = res);
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
      this.couchService.get('_users/org.couchdb.user:satellite').pipe(switchMap((res) =>
        forkJoin([
          this.couchService.delete('_users/org.couchdb.user:satellite?rev=' + res._rev),
          this.couchService.delete('_node/nonode@nohost/_config/satellite/pin')
        ])
      ),
      switchMap(() => this.couchService.allDocs('_replicator')),
      switchMap((docs: any) => {
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

  setFilterPredicate(db: string) {
    switch (db) {
      case 'resources':
        return filterSpecificFields([ 'title' ]);
      case 'courses':
        return filterSpecificFields([ 'courseTitle' ]);
    }
  }

  sendOnAccept(db: string) {
    this.dialogsListService.getListAndColumns(db).subscribe(res => {
      const previousList = res.tableData.filter(doc => doc.sendOnAccept === true),
        initialSelection = previousList.map(doc => doc._id);
      const data = {
        okClick: this.sendOnAcceptOkClick(db, previousList).bind(this),
        filterPredicate: this.setFilterPredicate(db),
        allowMulti: true,
        initialSelection,
        ...res };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  sendOnAcceptOkClick(db: string, previousList: any) {
    return (selected: any) => {
      const removedItems = previousList.filter(item => selected.findIndex(i => i._id === item.id) < 0)
        .map(item => ({ ...item, sendOnAccept: false }));
      const dataUpdate = selected.map(item => ({ ...item, sendOnAccept: true })).concat(removedItems);
      if (db === 'courses') {
        this.handleCourseAttachments(selected, previousList);
      }
      this.couchService.post(db + '/_bulk_docs', { docs: dataUpdate }).subscribe(res => {
        this.planetMessageService.showMessage('Added to send on accept list');
      });
      this.dialogRef.close();
    };
  }

  handleCourseAttachments(courses, removedCourses) {
    const { resources, exams } = this.coursesService.attachedItemsOfCourses(courses);
    // Not automatically removing attached resources because they can be selected independently
    const previousExams = this.coursesService.attachedItemsOfCourses(removedCourses).exams;
    this.sendOnAcceptOkClick('resources', [])(resources);
    this.sendOnAcceptOkClick('exams', previousExams)(exams);
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
