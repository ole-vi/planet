import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { filter, switchMap, combineLatest, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { MatFormField, MatFormFieldControl } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../courses.service';
import { CoursesService as PouchCoursesService } from '../../shared/services';
import { Course, FormStep, FormCourse } from '../interfaces';

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: [ './courses-add.scss' ]
})
export class CoursesAddComponent implements OnInit {
  onDestroy$ = new Subject<void>();
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { _rev: '', _id: '' };
  pageType = 'Add new';
  steps: FormStep[] = [];

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;

  mockStep = { stepTitle: 'Add title', description: '!!!' };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private pouchCoursesService: PouchCoursesService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
          ? ac => this.validatorService.isNameAvailible$(this.dbName, 'courseTitle', ac, this.route.snapshot.params.id)
          : ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac)
      ],
      description: [ '', Validators.required ],
      languageOfInstruction: '',
      memberLimit: [
        10, // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          CustomValidators.positiveNumberValidator
        ])
      ],
      method: '',
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      createdDate: Date.now()
    });
  }

  ngOnInit() {
    this.route.url.pipe(
      filter(segment => segment[0].path === 'update'),
      switchMap(() => this.route.paramMap.pipe(
        switchMap(paramMap => this.pouchCoursesService.getCourse(paramMap.get('id')))
      )),
      combineLatest(this.coursesService.courseUpdated$),
      takeUntil(this.onDestroy$)
    ).subscribe(([ course, storedCourse ]: [Course, FormCourse]) => {
      course.steps.forEach(step => {
        step['id'] = this.uniqueIdOfStep();
      });
      this.pageType = 'Update';
      this.documentInfo = { _rev: course._rev, _id: course._id };
      if (storedCourse && storedCourse.form) {
        this.setFormAndSteps(storedCourse);
      } else {
        this.setFormAndSteps({ form: course, steps: course.steps });
      }
    });
  }

  setFormAndSteps(course: FormCourse) {
    this.courseForm.patchValue(course.form);
    this.steps = course.steps || [];
  }

  updateCourse(courseInfo) {
    this.deleteStepIdProperty();
    this.pouchCoursesService.updateCourse({
      ...courseInfo,
      ...this.documentInfo,
      steps: this.steps
    }).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('Course Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateCourse(this.courseForm.value);
      } else {
        this.addCourse(this.courseForm.value);
      }
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    // By deleting the id property, ngFor trackBy will break
    // If user is not rerouted after update moving steps will no longer work
    this.deleteStepIdProperty();
    this.pouchCoursesService.addCourse({ ...courseInfo, steps: this.steps }).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('New Course Added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  deleteStepIdProperty() {
    this.steps.forEach(step => {
      delete step.id;
    });
  }

  addStep() {
    this.steps.push({
      id: this.uniqueIdOfStep(),
      stepTitle: '',
      description: '',
      resources: []
    });
  }

  uniqueIdOfStep() {
    // Highly unlikely random numbers will not be unique for practical amount of course steps
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  navigateBack() {
    this.coursesService.reset();
    this.router.navigate([ '/courses' ]);
  }

  addExam(stepIndex) {
    this.coursesService.returnUrl = this.router.url;
    this.coursesService.course = { form: this.courseForm.value, steps: this.steps };
    this.coursesService.stepIndex = stepIndex;
    if (this.steps[stepIndex].exam) {
      this.router.navigate([ '/courses/update/exam/', this.steps[stepIndex].exam._id ]);
    } else {
      this.router.navigate([ '/courses/exam/' ]);
    }
  }

  removeStep(pos) {
    this.steps.splice(pos, 1);
  }

  orderStep(oldPos, newPos) {
    const tempStep = this.steps[oldPos];
    this.steps.splice(oldPos, 1);
    this.steps.splice(newPos, 0, tempStep);
  }

  stepTrackByFn(index, item) {
    return item.id;
  }

}
