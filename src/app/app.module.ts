import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

import { AppRoutingModule } from './app-router.module';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports: [
    BrowserModule, AppRoutingModule, HttpClientModule, BrowserAnimationsModule
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  providers: [
    CouchService, AuthService, UserService, { provide: LOCALE_ID, useValue: 'ne' }
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
