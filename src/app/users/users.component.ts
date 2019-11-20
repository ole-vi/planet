import { Component, OnInit, OnDestroy } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin, Subject, of, Observable } from 'rxjs';
import { MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, takeUntil, debounceTime, map } from 'rxjs/operators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { debug } from '../debug-operator';
import { findByIdInArray } from '../shared/utils';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { UsersService } from './users.service';
import { TasksService } from '../tasks/tasks.service';
import { TableState } from './users-table.component';

@Component({
  templateUrl: './users.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }

    .mat-column-profile {
      max-width: 100px;
    }
  ` ]
})
export class UsersComponent implements OnInit, OnDestroy {

  users: any[] = [];
  message = '';
  searchValue = '';
  filter = { 'doc.roles' : '' };
  planetType = '';
  displayTable = true;
  displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  isUserAdmin = false;
  deleteDialog: any;
  children: any;
  roleList = this.usersService.roleList;
  allRolesList = this.usersService.allRolesList;
  selectedRoles: string[] = [];
  filteredRole: string;
  selection = new SelectionModel(true, []);
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();
  emptyData = false;
  private searchChange = new Subject<string>();
  configuration = this.stateService.configuration;
  tableState = new TableState();

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private reportsService: ReportsService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService,
    private usersService: UsersService,
    private tasksService: TasksService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.planetType = this.stateService.configuration.planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      this.applyFilter(params.get('search'));
    });
    this.managerService.getChildPlanets(true).pipe(map(
      (state) => this.reportsService.attachNamesToPlanets(state)
    )).subscribe(childPlanets => this.children = childPlanets);
    this.usersService.usersUpdated.pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      this.dialogsLoadingService.stop();
      this.users = users;
    });
    this.usersService.requestUsers();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  changeFilter(type, child: any = {}) {
    this.filterDisplayColumns(type);
    this.tableState = { ...this.tableState, filterType: type, selectedChild: child };
    this.searchChange.pipe(debounceTime(500)).subscribe((searchText) => {
      this.router.navigate([ '..', searchText ? { search: searchText } : {} ], { relativeTo: this.route });
    });
  }

  filterDisplayColumns(type: string) {
    if (type === 'local') {
      this.displayedColumns = [ 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
      if (this.isUserAdmin) {
        this.displayedColumns.unshift('select');
      }
    } else {
      this.displayedColumns = [ 'profile', 'name', 'joinDate', 'lastLogin', 'action' ];
    }
  }

  applyFilter(filterValue: string) {
    this.searchValue = filterValue;
    this.changeFilter(this.tableState.filterType);
  }

  searchChanged(searchText: string) {
    this.searchChange.next(searchText);
  }

  deleteClick(user, event) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteUser(user),
        amount: 'single',
        changeType: 'delete',
        type: 'user',
        displayName: user.name,
        extraMessage: user.requestId ? 'Planet associated with it will be disconnected.' : ''
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
    event.stopPropagation();
  }

  deleteUserFromTeams(user) {
    return this.couchService.findAll('teams', { selector: { userId: user._id } }).pipe(
      switchMap(teams => {
        const docsWithUser = teams.map(doc => ({ ...doc, _deleted: true }));
        return this.couchService.bulkDocs('teams', docsWithUser);
      })
    );
  }

  deleteUser(user) {
    const userId = 'org.couchdb.user:' + user.name;
    return {
      request: this.couchService.get('shelf/' + userId).pipe(
        switchMap(shelfUser => {
          return forkJoin([
            this.couchService.delete('_users/' + userId + '?rev=' + user._rev),
            this.couchService.delete('shelf/' + userId + '?rev=' + shelfUser._rev),
            this.deleteUserFromTeams(user),
            this.tasksService.removeAssigneeFromTasks(user._id)
          ]);
        })
      ),
      onNext: (data) => {
        this.selection.deselect(user._id);
        this.planetMessageService.showMessage('User deleted: ' + user.name);
        this.deleteDialog.close();
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.users = this.users.filter((u: any) => data[0].id !== u.doc._id);
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this user.')
    };
  }

  removeRole(user: any, roleIndex: number) {
    this.setRolesForUsers([ user._id ], [ ...user.roles.slice(0, roleIndex), ...user.roles.slice(roleIndex + 1) ]);
  }

  idsToUsers(userIds: any[]) {
    return userIds.map(userId => {
      const user: any = this.users.find((u: any) => u.doc._id === userId);
      return user.doc;
    });
  }

  setRolesForUsers(userIds: any[], roles: string[]) {
    const users: any = this.idsToUsers(userIds);
    const newRoles = [ 'learner', ...roles ];
    forkJoin(users.reduce((observers, user) => {
      // Do not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds
        const tempUser = { ...user, roles: newRoles };
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, [])).subscribe((responses) => {
      this.users = this.users.map((user: any) => {
        if (user.doc.isUserAdmin === false && userIds.indexOf(user.doc._id) > -1) {
          // Add role to UI and update rev from CouchDB response
          const res: any = responses.find((response: any) => response.id === user._id);
          return {
            ...user,
            roles: this.usersService.toProperRoles(newRoles),
            doc: { ...user.doc, roles: newRoles, _rev: res.rev }
          };
        }
        return user;
      });
    }, () => {
      this.planetMessageService.showAlert('There was an error adding role(s) to member(s)');
    });
  }

  toggleStatus(event, user, type: 'admin' | 'manager', isDemotion: boolean) {
    event.stopPropagation();
    ((type === 'admin' ? this.toggleAdminStatus(user) : this.toggleManagerStatus(user)) as Observable<any>).subscribe(
      () => {
        this.usersService.requestUsers();
        this.planetMessageService.showMessage(`${user.name} ${isDemotion ? 'demoted from' : 'promoted to'} ${type}`);
      },
      () => this.planetMessageService.showAlert(`There was an error ${isDemotion ? 'demoting' : 'promoting'} user`)
    );
  }

  toggleAdminStatus(user) {
    return user.roles.length === 0 ? this.usersService.demoteFromAdmin(user) : this.usersService.promoteToAdmin(user);
  }

  toggleManagerStatus(user) {
    return forkJoin([
      this.usersService.setRoles({ ...user, isUserAdmin: !user.isUserAdmin }, user.isUserAdmin ? user.oldRoles : [ 'manager' ]),
      user.isUserAdmin ? of({}) : this.usersService.removeFromTabletUsers(user)
    ]);
  }

  setRoles(user, roles, event) {
    event.stopPropagation();
    this.usersService.setRoles(user, roles).subscribe(() => {
      this.usersService.requestUsers();
      this.planetMessageService.showMessage(`${user.name} roles modified`);
    });
  }

  back() {
    // relative path for /users and /team/users based on depth
    const userUrl = this.router.url.split('/');
    const path = userUrl[1] === 'users' ? '../' : '../../';
    this.router.navigate([ path ], { relativeTo: this.route });
  }

  updateSelectedRoles(newSelection: { value: string, text: string }[]) {
    this.selectedRoles = newSelection.map(r => r.value);
  }

  onFilterChange(filterValue: string) {
    this.filter = { ...this.filter, 'doc.roles': filterValue === 'All' ? '' : filterValue };
    this.changeFilter(this.tableState.filterType);
  }

  resetFilter() {
    this.filteredRole = 'All';
    this.filter = { ...this.filter, 'doc.roles': '' };
    this.applyFilter('');
  }
}
