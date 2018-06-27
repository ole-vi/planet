import { NgModule } from '@angular/core';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { Routes, RouterModule } from '@angular/router';
import { ManagerSyncComponent } from './manager-sync.component';

const routes: Routes = [
  { path: '', component: ManagerDashboardComponent },
  { path: 'sync', component: ManagerSyncComponent },
  { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule', data: { parent: true } },
  { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule', data: { parent: true } },
  { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule', data: { parent: true } },
  { path: 'configuration', loadChildren: '../configuration/configuration.module#ConfigurationModule', data: { update: true } }
  ];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ManagerDashboardRouterModule {}
