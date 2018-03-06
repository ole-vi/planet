import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeComponent } from './home.component';
import { CommunityComponent } from '../community/community.component';
import { NationComponent } from '../nation/nation.component';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';
import { NotificationViewListComponent } from '../notification-view-list/notification-view-list.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'users', loadChildren: '../users/users.module#UsersModule' },
      { path: 'nation', component: NationComponent },
      { path: 'manager', component: ManagerDashboardComponent },
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
      { path: 'community', component: CommunityComponent },
      { path: 'community/:nation', component: CommunityComponent },
      { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule' },
      { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule' },
      { path: 'notifications', component: NotificationViewListComponent }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
