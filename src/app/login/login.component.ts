import { Component, ViewEncapsulation } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';

require('./login.scss');

export class UserData  {
  firstName: string;
  middleName: string;
  lastName: string;
  login: string;
  password: string;
  repeatPassword: string;
  email: string;
  phone: number;
  language: string;
  gender: string;
  levels: number;
  birthday: number;
  birthmonth: number;
  birthyear: number;
  community: string;
  region: string;
  nation: string;
}

@Component({
  templateUrl: './login.component.html',
  styleUrls: [ './login.scss' ],
  encapsulation: ViewEncapsulation.None
})

export class LoginComponent implements OnInit {

 newUser: UserData = new UserData();
 educationLevels: Array<any>= [ 1, 2, 3, 4, 5, 6 , 7, 8, 9, 11, 12, 'Higher' ];
 birthmonths: Array<any>= [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12 ];
 length: number= new Date().getFullYear();
 birthyears: number[] = new Array(length);
 birthdays: number[]= new Array();
 validated: boolean;
 createMode= false;
 loginMode= true;
 loginData = { username: '', password: '' };
 loginMessage: string;
 RegisterErrorMessage: string;

 constructor(
   private router: Router,
   private couchService: CouchService
   ) {
   for (let i = this.length; i > 1900; i--) {
     this.birthyears.push(i);
   }
   for (let j = 1; j < 32; j++) {
     this.birthdays.push(j);
   }
 }
  ngOnInit() {

  }

  login() {
    this.loginMessage = '';
    if (!this.loginData.username || !this.loginData.password) {
      this.loginMessage = 'Both Username and Password  are required';
    } else {
      this.couchService.post('_session', { 'name': this.loginData.username, 'password': this.loginData.password }, { withCredentials: true })
      .then((d) => {
        this.router.navigate([ '/' ]);
      }, (error) => this.loginMessage = 'Username and/or password do not match');
    }
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs')
    .then((data) => {
      return true; // user can see data so there is no admin
    }, (error) => {
      return false; // user doesn't have permission so there is an admin
    });
  }

  createAdmin() {
    this.couchService.put('_node/nonode@nohost/_config/admins/' + this.newUser.firstName, this.newUser.password).then((data) => {
       this.setlogin(); // direct to the login page
     });
  }

  setregister() {
    this.createMode = true;
    this.loginMode = false;
  }

  setlogin() {
    this.createMode = false;
    this.loginMode = true;
  }

  createUser(data) {
    this.validated = true;
    for ( const property in data) {
      if (!data[property]) {
        this.validated = false;
        this.RegisterErrorMessage = property + ' is required';
        break;
      }
    }
    if (this.validated) {
      this.loginMode = false;
      this.RegisterErrorMessage = '';
      if (this.newUser.password === this.newUser.repeatPassword) {
        this.RegisterErrorMessage = '';
        this.checkAdminExistence().then((noAdmin) => {
          if (noAdmin) {
            this.createAdmin();
          } else {
            this.createrecord();
          }
        });
      } else {
        this.RegisterErrorMessage = 'Password does not match!';
      }
    }
  }

  createrecord() {
    const name: string = this.newUser.firstName;
    const password: string = this.newUser.password;
    this.couchService.put('_users/org.couchdb.user:' + name, { 'name': name, 'password': password, 'userData': this.newUser, 'roles': [], 'type': 'user' })
    .then((data) => {
      this.setlogin(); // user created, redirect to login page
    }, (error) => {
      this.RegisterErrorMessage = '';
    });
  }
}

