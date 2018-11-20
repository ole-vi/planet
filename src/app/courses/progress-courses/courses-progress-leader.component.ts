import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { dedupeShelfReduce } from '../../shared/utils';

@Component({
  templateUrl: 'courses-progress.component.html',
  styleUrls: [ 'courses-progress.scss' ]
})
export class CoursesProgressLeaderComponent implements OnInit, OnDestroy {

  course: any;
  // Need to define this variable for template which is shared with CoursesProgressLearner
  headingStart = '';
  selectedStep: any;
  chartData: any[];
  submissions: any[] = [];
  onDestroy$ = new Subject<void>();
  yAxisLength = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true });
    });
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ course }) => {
      this.course = course;
      this.selectedStep = course.steps[0];
      this.setSubmissions();
    });
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submissions: any[]) => {
      this.submissions = submissions;
      this.setFullCourse(submissions);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onStepChange(value: any) {
    this.selectedStep = value;
    this.setSingleStep(this.submissions);
  }

  setSubmissions() {
    this.chartData = [];
    if (this.selectedStep.exam) {
      this.submissionsService.updateSubmissions({ parentId: this.course._id });
    }
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

  totalSubmissionAnswers(submission: any) {
    return submission.answers.map(a => ({ number: a.mistakes || (1 - (a.grade || 0)), fill: true })).reverse();
  }

  setFullCourse(submissions: any[]) {
    this.selectedStep = undefined;
    this.yAxisLength = this.course.steps.length;
    const users = submissions.map((sub: any) => sub.user.name).reduce(dedupeShelfReduce, []);
    this.chartData = users.map((user: string) => {
      const answers = this.course.steps.map((step: any) => {
        const submission =
          submissions.find((sub: any) => sub.user.name === user && sub.parentId === (step.exam._id + '@' + this.course._id));
        if (submission) {
          return {
            number: submission.answers.reduce((total, answer) => total + answer.mistakes || (1 - (answer.grade || 0)), 0), fill: true
          };
        }
        return { number: '', fill: false };
      }).reverse();
      return ({
        items: answers,
        label: user
      });
    });
  }

  setSingleStep(submissions: any[]) {
    const step = this.selectedStep;
    this.yAxisLength = this.selectedStep.exam.questions.length;
    this.chartData = submissions.filter(submission => submission.parentId === (step.exam._id + '@' + this.course._id)).map(
      submission => {
        const answers = this.totalSubmissionAnswers(submission);
        return {
          items: answers,
          label: submission.user.name
        };
      }
    );
  }

  changeData({ index }) {
    if (this.selectedStep === undefined) {
      this.selectedStep = this.course.steps[this.course.steps.length - (index + 1)];
      this.setSingleStep(this.submissions);
    }
  }

  resetToFullCourse() {
    this.setFullCourse(this.submissions);
  }

}
