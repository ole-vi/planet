import { Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators,
  ValidationErrors,
  AbstractControl
} from '@angular/forms';
import { Location } from '@angular/common';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/takeUntil';

import { CouchService } from '../shared/couchdb.service';
import { CourseValidatorsService } from '../validators/course-validators.service';
// searchDocuments is declared as a default export so we can import it like this
import searchDocuments, * as constants from './constants';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnDestroy {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant

  courseForm: FormGroup;

  isWeekly = false; // for toggling the days checkbox

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  days = constants.days;

  // for unsubscribing from Observables
  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(
    private location: Location,
    private fb: FormBuilder,
    private couchService: CouchService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        [Validators.required],
        [
          (ac: AbstractControl): Observable<ValidationErrors | null> =>
            this.checkCourseExists$(ac)
        ]
      ],
      description: ['', Validators.required],
      languageOfInstruction: '',
      memberLimit: [
        '',
        [CourseValidatorsService.integerValidator, Validators.min(1)]
      ],
      courseLeader: [''],
      method: '',
      gradeLevel: '',
      subjectLevel: '',
      startDate: ['', CourseValidatorsService.dateValidator],
      endDate: [
        '',
        [
          CourseValidatorsService.dateValidator,
          CourseValidatorsService.endDateValidator()
        ]
      ],
      day: this.fb.array([]),
      startTime: ['', CourseValidatorsService.timeValidator],
      endTime: [
        '',
        [
          CourseValidatorsService.timeValidator,
          CourseValidatorsService.endTimeValidator()
        ]
      ],
      location: '',
      backgroundColor: ['', CourseValidatorsService.hexValidator],
      foregroundColor: ['', CourseValidatorsService.hexValidator]
    });

    // set default values
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      backgroundColor: '#ffffff',
      foregroundColor: '#000000'
    });
  }

  onSubmit() {
    this.addCourse(this.courseForm.value);
  }

  // TODO move validators to their own file
  public courseCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, searchDocuments('courseTitle', title))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
    return Observable.fromPromise(isDuplicate).takeUntil(this.ngUnsubscribe);
  }

  public checkCourseExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every 1s for input change
    return Observable.timer(1000)
      .takeUntil(this.ngUnsubscribe)
      .switchMap(() => {
        return this.courseCheckerService$(ac.value).map(res => {
          if (res) {
            return { checkCourseExists: 'Course already exists' };
          } else {
            return null;
          }
        });
      });

    // another way of checking if course title is unique
    // this.courseForm.controls['courseTitle'].valueChanges
    //   .debounceTime(500)
    //   .subscribe(title => {
    //     this.couchService
    //       .post(`courses/_find`, this.searchQuery(title))
    //       .then(data => {
    //         if (data.docs.length === 0) {
    //           this.isUnique = true;
    //           return;
    //         }
    //         this.isUnique = false;
    //       });
    //   });
  }

  addCourse(courseInfo) {
    this.couchService.post(this.dbName, { ...courseInfo }).then(data => {
      // does not work..need to use router?
      this.location.go('/');
    });
  }

  cancel() {
    this.location.back();
  }

  /* FOR TOGGLING DAILY/WEEKLY DAYS */

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = <FormArray>this.courseForm.controls.day;

    if (isChecked) {
      // add to day array if checked
      dayFormArray.push(new FormControl(day));
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(x => x.value === day);
      dayFormArray.removeAt(index);
    }
  }

  // remove old values from array on radio button change
  toogleWeekly(val: boolean) {
    // empty the array
    this.courseForm.setControl('day', this.fb.array([]));
    if (val) {
      // add all days to the array if the course is daily
      this.courseForm.setControl('day', this.fb.array(this.days));
    }
    this.isWeekly = val;
  }

  ngOnDestroy() {
    // unsubscribing from observables
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
