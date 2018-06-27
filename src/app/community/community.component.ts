import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatDialog, MatSort, MatDialogRef } from '@angular/material';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { filterSpecificFields, composeFilterFunctions, filterDropdowns } from '../shared/table-helpers';
import { DialogsViewComponent } from '../shared/dialogs/dialogs-view.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit, AfterViewInit {
  message = '';
  communities = new MatTableDataSource();
  nations = [];
  filter = {
    registrationRequest: 'pending'
  };
  displayedColumns = [
    'name',
    'code',
    'localDomain',
    'createdDate',
    'action'
  ];
  editDialog: any;
  viewNationDetailDialog: any;
  dialogRef: MatDialogRef<DialogsListComponent>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.getCommunityList();
    this.communities.sortingDataAccessor = (item, property) => {
      switch (typeof item[property]) {
        case 'number':
          return item[property];
        case 'string':
          return item[property].toLowerCase();
      }
    };
    this.communities.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'code', 'name' ]) ]);
  }

  ngAfterViewInit() {
    this.communities.paginator = this.paginator;
    this.communities.sort = this.sort;
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue;
    // Force filter to update by setting it to a space if empty
    this.communities.filter = this.communities.filter || ' ';
  }

  requestListFilter(filterValue: string) {
    this.communities.filter = filterValue || this.dropdownsFill();
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return Object.entries(this.filter).reduce((emptySpace, [ field, val ]) => {
      if (val) {
        return ' ';
      }
      return emptySpace;
    }, '');
  }

  getCommunityList() {
    this.couchService.post('communityregistrationrequests/_find',
      findDocuments({ '_id': { '$gt': null } }, 0, [ { 'createdDate': 'desc' } ] ))
      .subscribe((data) => {
        this.communities.data = data.docs;
        this.requestListFilter('');
      }, (error) => this.message = 'There was a problem getting Communities');
  }

  updateRev(item, array) {
    array = array.map((c: any) => {
      if (c._id === item.id) {
        c._rev = item.rev;
      }
      return c;
    });
  }

  updateClick(community, change) {
    this.editDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.updateCommunity(community, change),
        changeType: change,
        type: 'community',
        displayName: community.name
      }
    });
  }

  updateCommunity(community, change) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
      // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      // Split community object into id, rev, and all other props in communityInfo
      const { _id: communityId, _rev: communityRev, ...communityInfo } = community;
      switch (change) {
        case 'delete':
          this.deleteCommunity(community);
          break;
        case 'reject':
        case 'unlink':
          const updatedCommunity = { ...community, registrationRequest: 'rejected' };
          this.rejectCommunity(updatedCommunity);
          break;
        case 'accept':
          forkJoin([
            // When accepting a registration request, add learner role to user from that community/nation,
            this.unlockUser(community),
            // update registration request to accepted
            this.couchService.put('communityregistrationrequests/' + communityId, { ...community, registrationRequest: 'accepted' })
          ]).subscribe((data) => {
            community.registrationRequest = 'accepted';
            this.updateRev(data, this.communities.data);
            this.getCommunityList();
            this.editDialog.close();
          }, (error) => this.editDialog.componentInstance.message = 'Planet was not accepted');
      }
    };
  }

  // Checks response and creates couch call if a doc was returned
  addDeleteObservable(res, db) {
    if (res.docs.length > 0) {
      const doc = res.docs[0];
      return this.couchService.delete(db + doc._id + '?rev=' + doc._rev);
    }
    return of({ 'ok': true });
  }

  deleteCommunity(community) {
    // Return a function with community on its scope to pass to delete dialog
    const { _id: id, _rev: rev } = community;
    return this.pipeRemovePlanetUser(this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev), community)
    .subscribe(([ data, userRes ]) => {
      // It's safer to remove the item from the array based on its id than to splice based on the index
      this.communities.data = this.communities.data.filter((comm: any) => data.id !== comm._id);
      this.editDialog.close();
    }, (error) => this.editDialog.componentInstance.message = 'There was a problem deleting this community');
  }

  rejectCommunity(community: any) {
    // Return a function with community on its scope to pass to delete dialog
    return this.pipeRemovePlanetUser(this.couchService.put('communityregistrationrequests/' + community._id, community), community)
    .subscribe(([ data, userRes ]) => {
      this.updateRev(data, this.communities.data);
      this.getCommunityList();
      this.editDialog.close();
    }, (error) => this.editDialog.componentInstance.message = 'There was a problem rejecting this community');
  }

  pipeRemovePlanetUser(obs: any, community) {
    return obs.pipe(
      switchMap(data => {
        return forkJoin([ of(data), this.removePlanetUser(community) ]);
      })
    );
  }

  removePlanetUser(community) {
    return forkJoin([
      this.couchService.post('_users/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } }),
      this.couchService.post('shelf/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } })
    ]).pipe(switchMap(([ user, shelf ]) => {
      return forkJoin([
        this.addDeleteObservable(user, '_users/'),
        this.addDeleteObservable(shelf, 'shelf/')
      ]);
    }));
  }

  // Gives the requesting user the 'learner' role & access to all DBs (as of April 2018)
  unlockUser(community) {
    return this.couchService.post('_users/_find', { 'selector': { 'requestId': community._id } })
      .pipe(switchMap(data => {
        const user = data.docs[0];
        return this.couchService.put('_users/' + user._id + '?rev=' + user._rev,
          { ...user, roles: [ 'learner' ] });
      }));
  }

  view(planet) {
    this.viewNationDetailDialog = this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: planet.planetType === 'nation' ? 'Nation Details' : 'Community Details'
      }
    });
  }

  getChildPlanet(url: string) {
    this.dialogsListService.getListAndColumns('communityregistrationrequests',
    { 'registrationRequest': 'accepted' }, { domain: url })
    .subscribe((planets) => {
      const data = {
        disableSelection: true,
        filterPredicate: filterSpecificFields([ 'name', 'code' ]),
        ...planets };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

}
