import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { FeedbackComponent } from '../feedback/feedback.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CoursesComponent } from '../courses/courses.component';
import { FormErrorMessagesComponent } from '../form-error-messages/form-error-messages.component';

import { CourseValidatorService } from '../validators/course-validator.service';

@NgModule({
  imports: [HomeRouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    FeedbackComponent,
    UsersComponent,
    CoursesComponent,
    FormErrorMessagesComponent
  ],
  providers: [CourseValidatorService]
})
export class HomeModule {}
