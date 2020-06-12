import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';
import { UsersComponent } from '../../users/users.component';

@Component({
  templateUrl: 'dialogs-add-table.component.html'
})
export class DialogsAddTableComponent implements AfterViewInit {

  @ViewChild(CoursesComponent, { static: false }) coursesComponent: CoursesComponent;
  @ViewChild(UsersComponent, { static: false }) usersComponent: UsersComponent;
  mode: 'courses' | 'users' = 'courses';
  okDisabled = true;
  get component() {
    return this.mode === 'courses' ?
      this.coursesComponent :
      this.mode === 'users' ?
      this.usersComponent.usersTable :
      undefined;
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsAddTableComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.mode = this.data.mode;
  }

  ngAfterViewInit() {
    this.component.selection.onChange.subscribe((selection) => {
      this.okDisabled = selection.source.selected.length === 0;
    });
  }

  ok() {
    if (!this.data.noSpinner) {
      this.dialogsLoadingService.start();
    }
    this.addExistingCourses();
  }

  addExistingCourses() {
    const tableData = this.component.tableData;
    const selection = this.component.selection.selected;
    const courses = tableData.data.filter((item: any) => selection.indexOf(item._id) > -1);
    this.data.okClick(courses);
  }

}
