import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';

@Component({
  templateUrl: 'courses-progress-leader.component.html',
  styleUrls: [ 'courses-progress-leader.scss' ]
})
export class CoursesProgressLeaderComponent implements OnInit, OnDestroy {

  course: any;
  selectedStep: any;
  chartData: any[];
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
      this.yAxisLength = submissions[0].parent.questions.length;
      this.chartData = submissions.map(
        submission => {
          const answers = submission.answers.map(a => ({ number: a.mistakes || (1 - (a.grade || 0)), fill: true })).reverse();
          return {
            items: answers,
            label: submission.user
          };
        }
      );
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onStepChange(value: any) {
    this.selectedStep = value;
    this.setSubmissions();
  }

  setSubmissions() {
    if (this.selectedStep.exam) {
      this.submissionsService.updateSubmissions({ parentId: this.selectedStep.exam._id + '@' + this.course._id });
    }
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

}
