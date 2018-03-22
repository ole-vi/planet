import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog } from '@angular/material';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { filterSpecificFields } from '../shared/table-helpers';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './courses.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-action {
      max-width: 225px;
    }
  ` ]
})

export class CoursesComponent implements OnInit, AfterViewInit {
  selection = new SelectionModel(true, []);
  courses = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'select', 'title', 'action' ];
  message = '';
  deleteDialog: any;
  fb: FormBuilder;
  courseForm: FormGroup;
  disableCourseAddButton: boolean = this.userService.get().isUserAdmin || this.userService.get().roles.length > 0 ? false : true;
  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.getCourses();
    this.courses.filterPredicate = filterSpecificFields([ 'courseTitle' ]);
  }

  getCourses() {
    this.couchService.get('courses/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.courses.data = data.rows.map((course: any) => {
          return course.doc;
        }).filter((c: any) => {
          return c._id !== '_design/course-validators';
        });
      }, (error) => this.planetMessageService.showAlert('There was a problem getting courses'));
  }

  ngAfterViewInit() {
    this.courses.sort = this.sort;
    this.courses.paginator = this.paginator;
  }

  searchFilter(filterValue: string) {
    this.courses.filter = filterValue.trim().toLowerCase();
  }

  updateCourse(course) {
    const { _id: courseId } = course;
    this.router.navigate([ '/courses/update/' + course._id ]);
  }

  deleteClick(course) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCourse(course),
        changeType: 'delete',
        type: 'course',
        displayName: course.courseTitle
      }
    });
  }

  deleteCourse(course) {
    // Return a function with course on its scope to pass to delete dialog
    return () => {
      const { _id: courseId, _rev: courseRev } = course;
      this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.courses.data = this.courses.data.filter((c: any) => data.id !== c._id);
          this.deleteDialog.close();
          this.planetMessageService.showAlert('Course deleted: ' + course.courseTitle);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course.');
    };
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.courses.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.courses.data.forEach(row => this.selection.select(row));
  }

}
