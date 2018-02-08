import { Component } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  template: `
    <a routerLink="/community" i18n mat-raised-button>Communities</a>
    <a routerLink="/nation" i18n mat-raised-button>Nations</a>
    <a routerLink="/feedback" i18n mat-raised-button>Feedback</a>
  `
})

export class ManagerDashboardComponent {

  constructor() { }

}
