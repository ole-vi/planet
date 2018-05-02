import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs/Subject';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

  course: any = { _id: '' };
  private courseUpdated = new Subject<any[]>();
  courseUpdated$ = this.courseUpdated.asObservable();

  constructor(
    private couchService: CouchService
  ) {}

  // Components call this to get details of one course.
  // If the id already matches what is stored on the service, return that.
  requestCourse(courseId: string, opts: any = {}) {
    if (courseId === this.course._id) {
      this.courseUpdated.next(this.course);
    } else {
      this.getCourse(courseId, opts);
    }
  }

  private getCourse(courseId: string, opts) {
    this.couchService.get('courses/' + courseId, opts).subscribe(course => {
      this.course = course;
      this.courseUpdated.next(course);
    });
  }

}
