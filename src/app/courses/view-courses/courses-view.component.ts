import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntil, switchMap, take, filter } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
import { Subject } from 'rxjs';
import { SubmissionsService } from '../../submissions/submissions.service';
import { StateService } from '../../shared/state.service';
import { MatMenuTrigger } from '@angular/material';

@Component({
  templateUrl: './courses-view.component.html',
  styleUrls: [ 'courses-view.scss' ]
})
export class CoursesViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  courseDetail: any = { steps: [] };
  parent = this.route.snapshot.data.parent;
  isUserEnrolled = false;
  progress = [ { stepNum: 1 } ];
  fullView = 'on';
  courseId: string;
  canManage: boolean;
  currentUser = this.userService.get();
  planetConfiguration = this.stateService.configuration;
  examText: 'retake' | 'take' = 'take';
  @ViewChild(MatMenuTrigger, { static: false }) previewButton: MatMenuTrigger;

  constructor(
    private router: Router,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private stateService: StateService,
  ) {}

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(
      switchMap(({ course, progress = [ { stepNum: 0 } ] }: { course: any, progress: any }) => {
        this.courseDetail = course;
        this.coursesService.courseActivity('visit', course);
        this.courseDetail.steps = this.courseDetail.steps.map((step, index) => ({
          ...step,
          resources: step.resources.filter(res => res._attachments).sort(this.coursesService.stepResourceSort),
          progress: progress.find((p: any) => p.stepNum === (index + 1))
        }));
        this.progress = progress;
        this.isUserEnrolled = this.checkMyCourses(course._id);
        this.canManage = this.currentUser.isUserAdmin ||
          this.courseDetail.creator !== undefined &&
          (this.currentUser.name === this.courseDetail.creator.slice(0, this.courseDetail.creator.indexOf('@')));
        return this.stateService.getCouchState('exams', 'local');
      }),
      takeUntil(this.onDestroy$)
    ).subscribe((exams) => {
      const stepExam = (step) => step.exam && exams.find(exam => exam._id === step.exam._id) || step.exam;
      this.courseDetail.steps = this.courseDetail.steps.map(step => ({ ...step, exam: stepExam(step) }));
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.courseId = params.get('id');
      this.coursesService.requestCourse({ courseId: this.courseId, forceLatest: true, parent: this.parent });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getStepSubmission(step, stepNum, getPrevious = true) {
    if (stepNum > 0 && getPrevious) {
      this.getStepSubmission(this.courseDetail.steps[stepNum - 1], stepNum - 1, false);
    }
    if (step.exam && step.submission === undefined) {
      this.submissionsService.openSubmission({
        parentId: step.exam._id + '@' + this.courseDetail._id,
        parent: step.exam,
        user: this.userService.get(),
        type: 'exam' });
      this.submissionsService.submissionUpdated$.pipe(
        filter(({ submission }) => submission.parent._id === step.exam._id),
        take(1)
      ).subscribe(({ submission, attempts }) => {
        step.examText = submission.answers.length > 0 ? 'continue' : attempts === 0 ? 'take' : 'retake';
        step.attempts = attempts;
        step.submission = submission;
      });
    }
  }

  viewStep() {
    const latestStep = this.progress.reduce((stepNum, prog) => {
      return prog.stepNum > stepNum ? prog.stepNum : stepNum;
    }, 1);
    this.router.navigate([ './step/' + latestStep ], { relativeTo: this.route });
  }

  goToSurvey(stepNum, preview = false) {
    this.router.navigate(
      [ `./step/${stepNum + 1}/exam`, { questionNum: 1, type: 'survey', preview, examId: this.courseDetail.steps[stepNum].survey._id } ],
      { relativeTo: this.route }
    );
  }

  goToExam(step, stepIndex, preview = false) {
    const questionNum = (this.submissionsService.nextQuestion(step.submission, step.submission.answers.length - 1, 'passed') + 1) || 1;
    const stepNum = stepIndex + 1;
    this.router.navigate(
      [
        `./step/${stepNum}/exam`,
        { id: this.courseId, stepNum, questionNum, type: 'exam', preview, examId: this.courseDetail.steps[stepIndex].exam._id }
      ],
      { relativeTo: this.route }
    );
  }

  previewButtonClick(step: any, stepNum: any): void {
    const stepType = this.coursesService.stepHasExamSurveyBoth(step);
    if (stepType === 'both' || stepType === undefined) {
      return;
    }
    this.previewButton.closeMenu();
    if (stepType === 'exam') {
      this.goToExam(step, stepNum, true);
    }
    if (stepType === 'survey') {
      this.goToSurvey(stepNum, true);
    }
  }

  checkMyCourses(courseId: string) {
    return this.userService.shelf.courseIds.includes(courseId);
  }

  updateRating(itemId) {
    this.coursesService.requestCourse({ courseId: itemId, forceLatest: true });
  }

  courseToggle(courseId, type) {
    this.coursesService.courseResignAdmission(courseId, type).subscribe((res) => {
      this.isUserEnrolled = !this.isUserEnrolled;
    }, (error) => ((error)));
  }

  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

  updateCourse() {
    this.router.navigate([ '/courses/update/' + this.courseId ]);
  }
  /**
   * Returns routing to previous parent page on Courses
   */
  goBack() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }
}
