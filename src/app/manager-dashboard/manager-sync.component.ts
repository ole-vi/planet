import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { SyncService } from '../shared/sync.service';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: './manager-sync.component.html'
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.getReplicators();
  }

  getReplicators() {
    this.couchService.allDocs('_replicator').subscribe(data => {
      this.replicators = data;
    });
  }

  runSyncClick() {
    this.updateReplicatorUsers().subscribe(() => {
      this.syncPlanet();
    });
  }

  syncPlanet() {
    const deleteArray = this.replicators.filter(rep => {
      const defaultList = this.replicatorList((type) => (val) => val.db + '_' + type);
      return rep._replication_state === 'completed' || defaultList.indexOf(rep._id) > -1;
    }).map(rep => {
      return { ...rep, _deleted: true };
    });
    this.syncService.deleteReplicators(deleteArray).pipe(switchMap(data => {
      return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList());
    })).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
      this.getReplicators();
    }, error => this.planetMessageService.showMessage(error));
  }

  replicatorList(mapFunc = (type) => (val) => ({ ...val, type })) {
    const pushList = [
      { db: 'courses_progress' },
      { db: 'feedback' },
      { db: 'login_activities' },
      { db: 'ratings' },
      { db: 'resource_activities' },
      { dbSource: 'replicator_users', dbTarget: 'child_users' },
      { db: 'submissions', selector: { source: this.userService.getConfig().code } }
    ];
    const pullList = [
      { db: 'feedback', selector: { source: this.userService.getConfig().code } },
      { db: 'notifications', selector: { target: this.userService.getConfig().code } },
      { db: 'submissions', selector: { source: this.userService.getConfig().code } }
    ];
    const internalList = [
      { dbSource: '_users', db: 'tablet_users', selector: { 'isUserAdmin': false, 'requestId': { '$exists': false } }, continuous: true }
    ];
    return pushList.map(mapFunc('push')).concat(pullList.map(mapFunc('pull'))).concat(internalList.map(mapFunc('internal')));
  }

  updateReplicatorUsers() {
    return forkJoin([
      this.couchService.findAll('_users', findDocuments(
        { 'isUserAdmin': { '$exists': true }, 'requestId': { '$exists': false } },
        this.userService.userProperties
      )),
      this.couchService.findAll('replicator_users', { 'selector': {} })
    ]).pipe(
      switchMap(([ users, repUsers ]) => {
        const newRepUsers = users.map((user: any) => {
          const repUser = repUsers.find((rUser: any) => rUser.couchId === user._id) || {},
            { _id, _rev, ...userProps } = user;
          return { ...repUser, ...userProps, _id: user.name + '@' + user.planetCode, couchId: user._id };
        });
        const deletedRepUsers = repUsers
          .filter((rUser: any) => users.findIndex((user: any) => rUser.couchId === user._id) < 0)
          .map((rUser: any) => ({ ...rUser, '_deleted': true }));
        return this.couchService.post('replicator_users/_bulk_docs', { docs: newRepUsers.concat(deletedRepUsers) });
      })
    );
  }

}
