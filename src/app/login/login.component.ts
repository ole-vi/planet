import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

require('./login.scss');

@Component({
    template: `
        <div class="ole-login">
            <div class="ole-logo">
                <img src="assets/cropped-ole-ico-logo-180x180.png">
                <h1>Planet Learning</h1>
                <h3>Version 2.01</h3>
            </div>
            <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
                <div>
                    <input [(ngModel)]="model.name" placeholder="Username" name="name" />
                </div>
                <div>
                    <input [(ngModel)]="model.password" placeholder="Password" name="password" type="password" />
                </div>
                <div *ngIf="createMode">
                    <input [(ngModel)]="model.repeatPassword" placeholder="Repeat Password" name="repeatPassword" type="password" />
                </div>
                <div class="login-actions">
                    <div><button class="ole-btn cursor-pointer">{{ createMode ? 'Create User' : 'SIGN-IN' }}</button></div>
                    <a [routerLink]="createMode ? ['/login'] : ['newuser']">{{ createMode ? 'Already have an account?' : 'Are you new?' }}</a>
                </div>
            </form>
            <div id="login-status">{{message}}</div>
        </div>
    `,
    styleUrls:['./login.scss']
    
})
export class LoginComponent { 
    constructor(
        private couchService: CouchService,
        private router: Router
    ) {}
    
    createMode:boolean = this.router.url.split('?')[0] === '/login/newuser';
    model = { name:'', password:'', repeatPassword:'' }
    message = '';
    
    onSubmit() {
        if(this.createMode) {
            this.createUser(this.model);
        } else {
            this.login(this.model);
        }
    }
    
    reRoute() {
        this.router.navigate(['/'], {});
    }
    
    createUser({name,password,repeatPassword}:{name:string,password:string,repeatPassword:string}) {
        if(password === repeatPassword) {
            this.couchService.put('_users/org.couchdb.user:' + name, {'name': name, 'password': password, 'roles': [], 'type': 'user'})
                .then((data) => {
                    this.message = 'User created: ' + data.id.replace('org.couchdb.user:','');
                    this.reRoute();
                }, (error) => this.message = '');
        } else {
            this.message = 'Passwords do not match';
        }
    }
    
    login({name,password}:{name:string,password:string}) {
        this.couchService.post('_session', {'name':name, 'password':password}, { withCredentials:true })
            .then((data) => { 
                this.reRoute();
            },(error) => this.message = 'Username and/or password do not match');
    }
}