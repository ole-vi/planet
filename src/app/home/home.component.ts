import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { languages } from '../shared/languages';
import { interval } from 'rxjs/observable/interval';
import { tap } from 'rxjs/operators';

@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px'
      })),
      state('open', style({
        width: '150px'
      })),
      transition('closed <=> open', animate('500ms ease'))
    ])
  ]
})
export class HomeComponent implements OnInit, AfterViewInit {
  name = '';
  roles: string[] = [];
  languages = [];
  current_flag = 'en';
  current_lang = 'English';
  sidenavState = 'closed';
  @ViewChild('content') private mainContent;

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).debug('Menu animation').pipe(tap(() => {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }));
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.languages = (<any>languages).map(language => {
      if (language.served_url === document.baseURI) {
        this.current_flag = language.short_code;
        this.current_lang = language.name;
      }
      return language;
    }).filter(lang  => {
      return lang['active'] !== 'N';
    });
  }

  ngAfterViewInit() {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }

  backgroundRoute() {
    const routesWithBackground = [ 'resources' ];
    const routesWithoutBackground = [ 'resources/add', 'resources/view' ];
    const isException = routesWithoutBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    const isRoute = routesWithBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    return isRoute && !isException;
  }

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.animDisp = this.animObs.subscribe();
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

  switchLanguage(served_url) {
    alert('You are going to switch in ' + served_url + ' environment');
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }
}
