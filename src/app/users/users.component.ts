import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { MatTableDataSource } from '@angular/material';

@Component({
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  name = '';
  roles: string[] = [];
  allUsers = new MatTableDataSource();
  message = '';
  displayTable = true;
  displayedColumns = [ 'name', 'roles' ];

  // List of all possible roles to add to users
  roleList: string[] = [ 'intern', 'learner', 'teacher' ];
  selectedRole = '';

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  select(user: any) {
    // Can't add roles to admins, so only select users
    if (user._id) {
      // Will not be defined at first, so use ternary operator rather than !=
      user.selected = user.selected ? false : true;
    }
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    if (this.roles.indexOf('_admin') > -1) {
      this.initializeData();
    } else {
      // A non-admin user cannot receive all user docs
      this.message = 'Access restricted to admins';
      this.displayTable = false;
    }
  }

  getUsers() {
    return this.couchService.get('_users/_all_docs?include_docs=true');
  }

  getAdmins() {
    // This nonode@nohost is working for couchdb as setup by Vagrant, but may need to be changed for other implementations
    return this.couchService.get('_node/nonode@nohost/_config/admins');
  }

  initializeData() {
    Promise.all([
      this.getUsers(),
      this.getAdmins()
    ]).then((data) => {

      const admins = [],
        adminData = data[1];
      for (const key in adminData) {
        if (adminData.hasOwnProperty(key)) {
          admins.push({ name: key, roles: [ 'admin' ], admin: true });
        }
      }

      this.allUsers.data = [].concat(
        data[0].rows.reduce((users: any[], user: any) => {
          if (user.id !== '_design/_auth') {
            users.push({ ...user.doc, admin: false });
          }
          return users;
        }, []),
        admins
      );

    }, (error) => {
      // A bit of a placeholder for error handling.  Request will return error if the logged in user is not an admin.
      console.log('Error initializing data!');
      console.log(error);
    });
  }

  deleteRole(user: any, index: number) {
    // Make copy of user so UI doesn't change until DB change succeeds
    const tempUser = Object.assign({}, user);
    tempUser.roles.splice(index, 1);
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).then((response) => {
      console.log('Success!');
      this.initializeData();
    }, (error) => {
      // Placeholder for error handling until we have popups for user notification.
      console.log('Error!');
      console.log(error);
    });
  }

  roleSubmit(users: any[], role: string) {
    Promise.all(users.reduce((promises, user) => {
      if (user.selected) {
        // Make copy of user so UI doesn't change until DB change succeeds
        const tempUser = Object.assign({}, user);
        // Remove selected property so it doesn't get saved to DB
        delete tempUser.selected;
        if (tempUser.roles.indexOf(role) === -1) {
          tempUser.roles.push(role);
        }
        promises.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return promises;
    }, [])).then((responses) => {
      this.initializeData();
    }, (error) => {
      // Placeholder for error handling until we have popups for user notification.
      console.log('Error!');
      console.log(error);
    });
  }

}
