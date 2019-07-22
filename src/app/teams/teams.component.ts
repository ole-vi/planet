import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  templateUrl: './teams.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-teamType {
      max-width: 150px;
      padding-right: 0.5rem;
    }
  ` ]
})
export class TeamsComponent implements OnInit, AfterViewInit {

  teams = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userMembership: any[] = [];
  displayedColumns = [ 'name', 'createdDate', 'teamType', 'action' ];
  dbName = 'teams';
  emptyData = false;
  user = this.userService.get();
  isAuthorized = false;
  planetType = this.stateService.configuration.planetType;
  leaveDialog: any;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog,
    private stateService: StateService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = filterSpecificFields([ 'doc.name' ]);
    this.teams.sortingDataAccessor = (item: any, property) => sortNumberOrString(item.doc, property);
    this.couchService.checkAuthorization('teams').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
  }

  getTeams() {
    forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }),
      this.getMembershipStatus()
    ]).subscribe(([ teams, requests ]) => {
      this.teams.data = this.teamList(teams);
      this.emptyData = !this.teams.data.length;
      this.dialogsLoadingService.stop();
    }, (error) => console.log(error));
  }

  getMembershipStatus() {
    return forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'userId': this.user._id } }),
      this.couchService.get('shelf/' + this.user._id)
    ]).pipe(
      map(([ membershipDocs, shelf ]) => this.userMembership = [
        ...membershipDocs,
        ...(shelf.myTeamIds || []).map(id => ({ teamId: id, fromShelf: true, docType: 'membership', userId: this.user._id }))
      ])
    );
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes) {
    return teamRes.map((res: any) => {
      const doc = res.doc || res;
      const membershipDoc = this.userMembership.find(req => req.teamId === doc._id) || {};
      const team = { doc, membershipDoc };
      switch (membershipDoc.docType) {
        case 'membership':
          return { ...team, userStatus: 'member', isLeader: membershipDoc.isLeader };
        case 'request':
          return { ...team, userStatus: 'requesting' };
        default:
          return { ...team, userStatus: 'unrelated' };
      }
    });
  }

  addTeam(team?) {
    this.teamsService.addTeamDialog(this.user._id, team).subscribe(() => {
      this.getTeams();
      const msg = team ? 'Team updated successfully' : 'Team created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

  toggleMembership(team, membershipDoc) {
    return this.teamsService.toggleTeamMembership(
      team, true, membershipDoc
    ).pipe(
      switchMap((newTeam: any) => {
        if (newTeam.status === 'archived') {
          this.removeTeamFromTable(team);
        }
        return this.getMembershipStatus();
    }));
  }

  openLeaveDialog(team, membershipDoc) {
    this.leaveDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.toggleMembership(team, membershipDoc),
          onNext: () => {
            this.leaveDialog.close();
            this.teams.data = this.teamList(this.teams.data);
            const msg = 'left';
            this.planetMessageService.showMessage('You have ' + msg + ' ' + team.name);
          },
        },
        changeType: 'leave',
        type: 'team',
        displayName: team.name
      }
    });
  }

  archiveTeam(team) {
    this.teamsService.archiveTeam(team).subscribe(() => {
      this.planetMessageService.showMessage('You have deleted a team.');
      this.removeTeamFromTable(team);
    });
  }

  removeTeamFromTable(newTeam: any) {
    this.teams.data = this.teams.data.filter((t: any) => t.doc._id !== newTeam._id);
  }

  requestToJoin(team) {
    this.teamsService.requestToJoinTeam(team, this.userService.get()._id).pipe(
      switchMap(() => this.teamsService.getTeamMembers(team)),
      switchMap((docs) => this.teamsService.sendNotifications('request', docs, { team, url: this.router.url + '/view/' + team._id })),
      switchMap(() => this.getMembershipStatus())
    ).subscribe(() => {
      this.teams.data = this.teamList(this.teams.data);
      this.planetMessageService.showMessage('Request to join team sent');
    });
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue;
  }

}
