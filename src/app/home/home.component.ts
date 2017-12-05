import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <planet-navigation></planet-navigation>
    <main class="container" dir="{{languageDirection}}">
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrls: [ './home.scss' ]
})
export class HomeComponent {

  languageDirection: string = localStorage.getItem('direction');

}
