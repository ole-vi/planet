import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

import { AppRoutingModule } from './app-router.module';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';
import { ValidatorService } from './validators/validator.service';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PouchdbService } from './shared/pouchdb.service';

@NgModule({
  imports: [
    BrowserModule, AppRoutingModule, HttpClientModule, BrowserAnimationsModule
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  providers: [
    CouchService, AuthService, UserService, ValidatorService, PouchdbService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
