import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
@Component({
  template: `
    <div *ngIf="planet_type !== 'community' && displayDashboard"><a routerLink="/requests" i18n mat-raised-button>Requests</a> <a routerLink="/associated/{{ planet_type === 'center' ? 'nation' : 'community' }}" i18n mat-raised-button>{{ planet_type === 'center' ? 'Nation' : 'Community' }}</a></div>
    <div *ngIf="displayDashboard">
      <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
    </div>
    <div>{{message}}</div>
  `
})
export class ManagerDashboardComponent implements OnInit {
  planet_type = [];
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
  }

}
