import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

@Component({
  templateUrl: './teams.component.html'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  private onDestroy$ = new Subject<void>();
  teams = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userShelf: any = [];
  userRequests: any[] = [];
  displayedColumns = [ 'name', 'createdDate', 'action' ];
  dbName = 'teams';
  emptyData = false;
  user = this.userService.get();
  isAuthorized = false;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.teams.data = this.teamList(this.teams.data, shelf.myTeamIds);
      });
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
      this.getRequests()
    ]).subscribe(([ teams, requests ]) => {
      this.userShelf = this.userService.shelf;
      this.teams.data = this.teamList(teams, this.userService.shelf.myTeamIds);
      this.emptyData = !this.teams.data.length;
      this.dialogsLoadingService.stop();
    }, (error) => console.log(error));
  }

  getRequests() {
    return this.couchService.findAll(this.dbName, { 'selector': { 'docType': 'request', 'userId': this.user._id } }).pipe(
      map(requests => this.userRequests = requests)
    );
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes, userTeamRes) {
    return teamRes.map((res: any) => {
      const team = { doc: res.doc || res, userStatus: 'unrelated' };
      team.userStatus = userTeamRes.indexOf(team.doc._id) > -1 ? 'member' : team.userStatus;
      team.userStatus = this.userRequests.some(req => req.teamId === team.doc._id) ? 'requesting' : team.userStatus;
      return team;
    });
  }

  addTeam(team?) {
    this.teamsService.addTeamDialog(this.userShelf, team).subscribe(() => {
      this.getTeams();
      const msg = team ? 'Team updated successfully' : 'Team created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

  toggleMembership(team, leaveTeam) {
    this.teamsService.toggleTeamMembership(team, leaveTeam, this.userShelf).subscribe((newTeam) => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team.');
      if (newTeam.status === 'archived') {
        this.teams.data = this.teams.data.filter((t: any) => t.doc._id !== newTeam._id);
      }
    });
  }

  requestToJoin(team) {
    this.teamsService.requestToJoinTeam(team, this.userService.get()._id).pipe(
      switchMap((newTeam) => {
        this.getRequests().subscribe(() => this.teams.data = this.teamList(this.teams.data, this.userService.shelf.myTeamIds));
        return this.teamsService.getTeamMembers(newTeam);
      }),
      switchMap((docs) => {
        return this.teamsService.sendNotifications('request', docs, { team, url: this.router.url + '/view/' + team._id });
      })
    ).subscribe(() => this.planetMessageService.showMessage('Request to join team sent'));
  }

  // If multiple team is added then need to check
  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue;
  }

}
