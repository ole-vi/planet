import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { DialogsChangeComponent } from '../shared/dialogs/dialogs-change.component';
import { MatTableDataSource, MatPaginator, MatDialog } from '@angular/material';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit, AfterViewInit {
  message = '';
  communities = new MatTableDataSource();
  selectedValue = '';
  selectedNation = '';
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
  changeDialog: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  ngAfterViewInit() {
    this.communities.paginator = this.paginator;
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.nations = data.rows.map(function(nt){
          if (nt.doc.name === this.route.snapshot.paramMap.get('nation')) {
            this.selectedNation = nt.doc.nationurl;
            this.communities.filter = this.selectedNation;
          }
          return nt;
        }, this);
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  getCommunityList() {
     this.couchService.get('communityregistrationrequests/_all_docs?include_docs=true')
      .subscribe((data) => {
        // _all_docs returns object with rows array of objects with 'doc' property that has an object with the data.
        // Map over data.rows to remove the 'doc' property layer
        this.communities.data = data.rows.map(community => community.doc);
      }, (error) => this.message = 'There was a problem getting Communities');
  }

  changeUpdate(community, change) {
    this.changeDialog = this.dialog.open(DialogsChangeComponent, {
      data: {
        okClick: change === 'delete' ? this.deleteCommunity(community) : this.updateCommunity(community, change),
        changeType: change,
        type: 'community',
        displayName: community.name
      }
    });
  }

  updateCommunity(community, change) {
    return () => {
      const { _id: id, _rev: rev } = community;
      community.registrationRequest = change;
      this.couchService.put('communityregistrationrequests/' + id + '?rev=' + rev, community)
        .subscribe( data => {
          this.revIdUpdate(this.communities.data, data);
          this.changeDialog.close();
        }, (error) => this.changeDialog.componentInstance.message = 'There was a problem accepting this community');
    };
  }

  revIdUpdate(previousData, recentData) {
    previousData.map(num => {
      if (num._id === recentData.id) {
          num._rev = recentData.rev;
      }
      return num._rev;
    });
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
          this.changeDialog.close();
        }, (error) => this.changeDialog.componentInstance.message = 'There was a problem deleting this community');
    };
  }

  onChange(filterValue: string) {
    this.communities.filter = filterValue;
  }

  onSelect(select: string) {
    this.communities.filter = select;
  }

  ngOnInit() {
    this.getNationList();
    this.getCommunityList();
  }

}
