import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './login-form.component.html',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  model = { name: '', password: '', repeatPassword: '' };
  
  onSubmit() {
    if (this.createMode) {
      this.createUser(this.model);
    } else {
      this.login(this.model, false);
    }
  }

  welcomeNotification(user_id) {
    const data = {
      'user': user_id,
      'message': 'Welcome ' + user_id.replace('org.couchdb.user:', '') + ' to the Planet Learning',
     'link': '',
      'type': 'register',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
    this.couchService.post('notifications', data)
      .subscribe((res) => {
      }, (error) => this.planetMessageService.showMessage('Error'));
  }

  reRoute() {
    this.router.navigate([ this.returnUrl ]);
  }

  createUser({ name, password, repeatPassword }: {name: string, password: string, repeatPassword: string}) {
    if (password === repeatPassword) {
      this.couchService.put('_users/org.couchdb.user:' + name.toLowerCase(),
      { 'name': name.toLowerCase(), 'password': password, 'roles': [], 'type': 'user', 'isUserAdmin': false })
        .subscribe((data) => {
          this.planetMessageService.showMessage('User created: ' + data.id.replace('org.couchdb.user:', ''));
          this.welcomeNotification(data.id);
          this.login(this.model, true);
        }, (error) => this.planetMessageService.showMessage(error.error.reason));
    } else {
        this.planetMessageService.showMessage('Passwords do not match');
    }
  }

  login({ name, password }: {name: string, password: string}, isCreate: boolean) {
    this.couchService.post('_session', { 'name': name.toLowerCase(), 'password': password }, { withCredentials: true })
      .pipe(switchMap((data) => {
        // Post new session info to login_activity
        this.userService.set(data);
        return this.userService.newSessionLog();
      })).subscribe((res) => {
        if (isCreate) {
          this.router.navigate( [ 'users/update/' + name.toLowerCase() ]);
        } else {
          this.reRoute();
        }
      }, (error) => this.planetMessageService.showMessage(error.error.reason));
  }
}
