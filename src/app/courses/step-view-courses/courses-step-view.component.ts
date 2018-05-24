import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  templateUrl: './courses-step-view.component.html',
  styleUrls: [ './courses-step-view.scss' ]
})

export class CoursesStepViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  stepNum = 0;
  stepDetail: any = { stepTitle: '', description: '' };
  maxStep = 1;
  resourceUrl = '';
  examStart = 1;
  attempt = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private userService: UserService,
    private couchService: CouchService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((course: any) => {
      // To be readable by non-technical people stepNum param will start at 1
      this.stepDetail = course.steps[this.stepNum - 1];
      this.maxStep = course.steps.length;
      if (this.stepDetail.exam) {
        this.coursesService.openSubmission({
          parentId: this.stepDetail.exam._id + '@' + course._id,
          parent: this.stepDetail.exam,
          user: this.userService.get().name,
          type: 'exam' });
        this.couchService.post('submissions/_find',
          { 'selector': { parentId: this.stepDetail.exam._id + '@' + course._id, user: this.userService.get().name, status: 'complete' } })
            .subscribe((res) => {
              this.attempt = res.docs.length;
            });
      }
      this.coursesService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submission: any) => {
        this.examStart = submission.answers.length + 1;
      });
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.stepNum = +params.get('stepNum'); // Leading + forces string to number
      this.coursesService.requestCourse({ courseId: params.get('id') });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  // direction = -1 for previous, 1 for next
  changeStep(direction) {
    this.router.navigate([ '../' + (this.stepNum + direction) ], { relativeTo: this.route });
  }

  backToCourseDetail() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

  setResourceUrl(resourceUrl: string) {
    this.resourceUrl = resourceUrl;
  }

  goToExam() {
    this.router.navigate([ 'exam', this.examStart ], { relativeTo: this.route });
  }

}
