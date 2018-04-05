import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatDialog } from '@angular/material';
import { switchMap } from 'rxjs/operators';
import { filterDropdowns } from '../shared/table-helpers';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit, AfterViewInit {
  message = '';
  communities = new MatTableDataSource();
  nations = [];
  displayedColumns = [ 'name',
    'lastAppUpdateDate',
    'version',
    'nationName',
    'lastPublicationsSyncDate',
    'lastActivitiesSyncDate',
    'registrationRequest',
    'action'
  ];
  editDialog: any;
  filter = {
    'registrationRequest': '',
    'nationName': this.route.snapshot.paramMap.get('nation') || ''
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.communities.filterPredicate = filterDropdowns(this.filter);
    this.getNationList();
    this.getCommunityList();
    this.communities.filter = this.filter.nationName;
  }

  ngAfterViewInit() {
    this.communities.paginator = this.paginator;
  }

  getNationList() {
    this.couchService.allDocs('nations')
      .subscribe((data) => {
        this.nations = data;
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  getCommunityList() {
     this.couchService.allDocs('communityregistrationrequests')
      .subscribe((data) => {
        this.communities.data = data;
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
        okClick: change === 'delete' ? this.deleteCommunity(community) : this.updateCommunity(community, change),
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
      const { _id: id, _rev: rev } = community;
      community.registrationRequest = change;
      this.couchService.put('communityregistrationrequests/' + id + '?rev=' + rev, community)
        .subscribe((data) => {
          this.updateRev(data, this.communities.data);
          this.editDialog.close();
        }, (error) => this.editDialog.componentInstance.message = 'There was a problem accepting this community');
    };
  }

  deleteCommunity(community) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      const { _id: id, _rev: rev } = community;
      this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.communities.data = this.communities.data.filter((comm: any) => data.id !== comm._id);
          this.editDialog.close();
        }, (error) => this.editDialog.componentInstance.message = 'There was a problem deleting this community');
    };
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Changing the filter string to trigger filterPredicate
    this.communities.filter = filterValue;
  }

}
