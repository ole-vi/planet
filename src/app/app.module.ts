import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule,ReactiveFormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";

import { RouterModule,Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './register/register.component';
import { MembersComponent } from './members/members.component';
import { TestComponent } from './test/test.component';
import { NgxPaginationModule } from 'ngx-pagination'

// const appRoutes: Routes = [
  // { path: '',   component: LoginComponent, pathMatch: 'full' }
// ];

@NgModule({
  declarations: [
    AppComponent,
    // RouterModule,
    LoginComponent,
    NavComponent,
    FooterComponent,
    PageNotFoundComponent,
    DashboardComponent,
    RegisterComponent,
    MembersComponent,
    TestComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    NgxPaginationModule,
    RouterModule.forRoot([
        {
            path: '',
            component: LoginComponent
        },
        {
            path: 'login',
            component: LoginComponent
        },
        {
            path: 'dashboard',
            canActivate: [AuthService],
            component: DashboardComponent,
            children: [
              { 
                path: 'test',
                component: TestComponent
              }
            ]
        },
        {
            path: 'register',
            component: RegisterComponent
        },
        {
            path: 'members',
            canActivate: [AuthService],
            component: MembersComponent
        },
        {
            path: '**',
            component: PageNotFoundComponent
        }
    ])
  ],
  providers: [CouchService, AuthService, UserService],
  bootstrap: [AppComponent]
})
export class AppModule { }
