import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';
import { CoursesViewComponent } from './view-courses/courses-view.component';
import { ExamsAddComponent } from '../exams/exams-add.component';
import { CoursesStepViewComponent } from './step-view-courses/courses-step-view.component';
import { ExamsViewComponent } from '../exams/exams-view.component';
import { CoursesProgressLeaderComponent } from './progress-courses/courses-progress-leader.component';

const routes: Routes = [
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent },
  { path: 'request', component: CoursesRequestComponent },
  { path: 'update/:id', component: CoursesAddComponent },
  { path: 'view/:id', component: CoursesViewComponent },
  { path: 'exam', component: ExamsAddComponent },
  { path: 'view/:id/step/:stepNum', component: CoursesStepViewComponent, },
  { path: 'view/:id/step/:stepNum/exam', component: ExamsViewComponent },
  { path: 'update/exam/:id', component: ExamsAddComponent },
  { path: 'progress/:id', component: CoursesProgressLeaderComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CoursesRouterModule {}
