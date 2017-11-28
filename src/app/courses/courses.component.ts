import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog } from '@angular/material';

@Component({
  templateUrl: './courses.component.html',
  styleUrls: [ './courses.component.scss' ]
})
export class CoursesComponent implements OnInit, AfterViewInit {

  coursesList = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'action' ];
  message = '';
  courses = [];
  deleteDialog: any;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.getCourses();
  }

  getCourses() {
    this.couchService.get('courses/_all_docs?include_docs=true')
      .then((data) => {
        this.coursesList.data = data.rows.reduce((courses: any[], course: any) => {
          if (course.id !== '_design/course-validators') {
            courses.push({ ...course.doc });
          }
          return courses;
        }, []);
      });
  }

  ngAfterViewInit() {
    this.coursesList.sort = this.sort;
    this.coursesList.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.coursesList.filter = filterValue;
  }

  deleteClick(course) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteCourse(course.doc),
        type: 'course',
        displayName: course.doc.courseTitle
      }
    });
  }

  deleteCourse(course) {
    // Return a function with course on its scope to pass to delete dialog
    return () => {
      const { _id: courseId, _rev: courseRev } = course;
      this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .then((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.courses = this.courses.filter(c => data.id !== c.doc._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course');
    };
  }

}
