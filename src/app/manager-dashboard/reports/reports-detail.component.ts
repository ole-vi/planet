import { Component, OnInit, OnDestroy, ViewEncapsulation, HostBinding } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import { combineLatest, Subject } from 'rxjs';
import { map, takeUntil, take } from 'rxjs/operators';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { Chart } from 'chart.js';
import { styleVariables } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { CsvService } from '../../shared/csv.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import {
  attachNamesToPlanets, filterByDate, setMonths, activityParams, codeToPlanetName, reportsDetailParams, xyChartData, datasetObject,
  titleOfChartName, monthDataLabels
} from './reports.utils';
import { MatDialog } from '@angular/material';
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';
import { ReportsDetailData, ReportDetailFilter } from './reports-detail-data';
import { UsersService } from '../../users/users.service';
import { CoursesViewDetailDialogComponent } from '../../courses/view-courses/courses-view-detail.component';

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: [ 'reports-detail.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ReportsDetailComponent implements OnInit, OnDestroy {

  @HostBinding('class') readonly hostClass = 'manager-reports-detail';
  parentCode = '';
  planetCode = '';
  planetName = '';
  reports: any = {};
  charts: Chart[] = [];
  users: any[] = [];
  onDestroy$ = new Subject<void>();
  filter: ReportDetailFilter = { app: '', startDate: new Date(0), endDate: new Date() };
  codeParam = '';
  loginActivities = new ReportsDetailData('loginTime');
  resourceActivities = { byDoc: [], total: new ReportsDetailData('time') };
  courseActivities = { byDoc: [], total: new ReportsDetailData('time') };
  today: Date;
  minDate: Date;
  ratings = { total: new ReportsDetailData('time'), resources: [], courses: [] };
  dateFilterForm: FormGroup;
  disableShowAllTime = true;

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private csvService: CsvService,
    private dialogsFormService: DialogsFormService,
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.initDateFilterForm();
  }

  ngOnInit() {
    const dbName = 'communityregistrationrequests';
    this.dialogsLoadingService.start();
    combineLatest(this.route.paramMap, this.stateService.couchStateListener(dbName)).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ params, planetState ]: [ ParamMap, any ]) => {
      if (planetState === undefined) {
        return;
      }
      const planets = attachNamesToPlanets((planetState && planetState.newData) || []);
      this.codeParam = params.get('code');
      this.planetCode = this.codeParam || this.stateService.configuration.code;
      this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
      this.planetName = codeToPlanetName(this.codeParam, this.stateService.configuration, planets);
      this.initializeData(!this.codeParam);
    });
    this.stateService.requestData(dbName, 'local');
    this.couchService.currentTime().subscribe((currentTime: number) => {
      this.today = new Date(currentTime);
      this.dateFilterForm.controls.endDate.setValue(this.today);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onFilterChange(filterValue: '' | 'planet' | 'myplanet') {
    this.filter.app = filterValue;
    this.filterData();
  }

  setFilterDate(date: Date, field: 'startDate' | 'endDate') {
    this.filter[field] = date;
    this.loginActivities.filter(this.filter);
  }

  initializeData(local: boolean) {
    this.activityService.getTotalUsers(this.planetCode, local).pipe(map(({ count, byGender, byMonth }) => {
      this.reports.totalUsers = count;
      this.reports.usersByGender = byGender;
    })).subscribe(() => {
      this.getLoginActivities();
      this.getRatingInfo();
      this.getDocVisits('resourceActivities');
      this.getDocVisits('courseActivities');
      this.getPlanetCounts(local);
      this.dialogsLoadingService.stop();
    });
  }

  initDateFilterForm() {
    this.dateFilterForm = this.fb.group({
      startDate: new Date(),
      endDate: new Date()
    });
    this.dateFilterForm.valueChanges.subscribe(value => {
      this.filter = { ...this.filter, ...value };
      if (this.minDate && this.today) {
        this.disableShowAllTime = value.startDate.getTime() === this.minDate.getTime() &&
          value.endDate.getTime() === this.today.setHours(0, 0, 0, 0);
      }
      this.filterData();
    });
  }

  filterData() {
    this.loginActivities.filter(this.filter);
    this.setLoginActivities();
    this.ratings.total.filter(this.filter);
    this.setRatingInfo();
    this.resourceActivities.total.filter(this.filter);
    this.setDocVisits('resourceActivities');
    this.courseActivities.total.filter(this.filter);
    this.setDocVisits('courseActivities');
  }

  getLoginActivities() {
    combineLatest([
      this.usersService.usersListener(true),
      this.activityService.getAllActivities('login_activities', activityParams(this.planetCode))
    ]).pipe(take(1)).subscribe(([ users, loginActivities ]: [ any[], any ]) => {
      this.loginActivities.data = loginActivities;
      this.users = users;
      this.minDate = new Date(new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0));
      this.dateFilterForm.controls.startDate.setValue(this.minDate);
      this.setLoginActivities();
    });
    this.usersService.requestUserData();
  }

  setLoginActivities() {
    const { byUser, byMonth } = this.activityService.groupLoginActivities(this.loginActivities.filteredData);
    this.reports.totalMemberVisits = byUser.reduce((total, resource: any) => total + resource.count, 0);
    const byUserWithProfile = byUser.map((activity) => ({
      ...activity,
      userDoc: this.users.find((user) => user.doc.name === activity.user && user.doc.planetCode === this.planetCode)
    }));
    this.reports.visits = byUserWithProfile.slice(0, 5);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'visitChart' });
    this.setChart({ ...this.setGenderDatasets(byMonth, true), chartName: 'uniqueVisitChart' });
  }

  getRatingInfo() {
    this.activityService.getRatingInfo(activityParams(this.planetCode)).subscribe((ratings: any[]) => {
      this.ratings.total.data = ratings;
      this.setRatingInfo();
    });
  }

  setRatingInfo() {
    const averageRatings = this.activityService.groupRatings(this.ratings.total.filteredData);
    this.ratings.resources = averageRatings.filter(item => item.type === 'resource');
    this.ratings.courses = averageRatings.filter(item => item.type === 'course');
    this.reports.resourceRatings = this.ratings.resources.slice(0, 5);
    this.reports.courseRatings = this.ratings.courses.slice(0, 5);
  }

  getDocVisits(type) {
    const params = reportsDetailParams(type);
    this.activityService.getAllActivities(params.db, activityParams(this.planetCode))
    .subscribe((activities: any) => {
      // Filter out bad data caused by error found Mar 2 2020 where course id was sometimes undefined in database
      // Also filter out bad data found Mar 29 2020 where resourceId included '_design'
      this[type].total.data = activities.filter(
        activity => (activity.resourceId || activity.courseId) && (activity.resourceId || activity.courseId).indexOf('_design') === -1
          && !activity.private
      );
      this.setDocVisits(type);
    });
  }

  setDocVisits(type) {
    const params = reportsDetailParams(type);
    const { byDoc, byMonth } = this.activityService.groupDocVisits(this[type].total.filteredData, type.replace('Activities', 'Id'));
    this[type].byDoc = byDoc;
    this.reports[params.views] = byDoc.reduce((total, doc: any) => total + doc.count, 0);
    this.reports[params.record] = byDoc.sort((a, b) => b.count - a.count).slice(0, 5);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: params.chartName });
  }

  getPlanetCounts(local: boolean) {
    if (local) {
      this.activityService.getDatabaseCount('resources').subscribe(count => this.reports.totalResources = count);
      this.activityService.getDatabaseCount('courses').subscribe(count => this.reports.totalCourses = count);
    } else {
      this.activityService.getChildDatabaseCounts(this.planetCode).subscribe((response: any) => {
        this.reports.totalResources = response.totalResources;
        this.reports.totalCourses = response.totalCourses;
      });
    }
  }

  setGenderDatasets(data, unique = false) {
    const months = setMonths();
    const genderFilter = (gender: string) =>
      months.map((month) => data.find((datum: any) => datum.gender === gender && datum.date === month) || { date: month, unique: [] });
    const monthlyObj = (month) => {
      const monthlyData = data.filter((datum: any) => datum.date === month);
      return ({
        count: monthlyData.reduce((count: number, datum: any) => count + datum.count, 0),
        unique: monthlyData.reduce((allUnique: string[], datum: any) => allUnique.concat(datum.unique), [])
      });
    };
    const totals = () => months.map((month) => ({ date: month, ...monthlyObj(month) }));
    return ({
      data: {
        datasets: [
          datasetObject('Male', xyChartData(genderFilter('male'), unique), styleVariables.primaryLighter),
          datasetObject('Female', xyChartData(genderFilter('female'), unique), styleVariables.accentLighter),
          datasetObject('Did not specify', xyChartData(genderFilter(undefined), unique), styleVariables.grey),
          datasetObject('Total', xyChartData(totals(), unique), styleVariables.primary)
        ]
      },
      labels: months.map(month => monthDataLabels(month))
    });
  }

  setChart({ data, labels, chartName }) {
    const updateChart = this.charts.find(chart => chart.canvas.id === chartName);
    if (updateChart) {
      updateChart.data = { ...data, labels: [] };
      updateChart.update();
      return;
    }
    this.charts.push(new Chart(chartName, {
      type: 'bar',
      data,
      options: {
        title: { display: true, text: titleOfChartName(chartName), fontSize: 16 },
        legend: { position: 'bottom' },
        maintainAspectRatio: false,
        scales: {
          xAxes: [ { labels, type: 'category' } ],
          yAxes: [ {
            type: 'linear',
            ticks: { beginAtZero: true, precision: 0, suggestedMax: 10 }
          } ]
        }
      }
    }));
  }

  openExportDialog(reportType: 'logins' | 'resourceViews' | 'courseViews' | 'summary') {
    const minDate = new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0);
    const commonProps = { 'type': 'date', 'required': true, 'min': new Date(minDate), 'max': new Date(this.today) };
    const fields = [
      {
        'placeholder': 'From',
        'name': 'startDate',
        ...commonProps
      },
      {
        'placeholder': 'To',
        'name': 'endDate',
        ...commonProps
      }
    ];
    const formGroup = {
      startDate: new Date(minDate),
      endDate: [ new Date(this.today), CustomValidators.endDateValidator() ]
    };
    this.dialogsFormService.openDialogsForm('Select Date Range for Data Export', fields, formGroup, {
      onSubmit: (dateRange: any) => this.exportCSV(reportType, dateRange)
    });
  }

  exportCSV(reportType: string, dateRange: { startDate: Date, endDate: Date }) {
    dateRange.endDate = new Date(dateRange.endDate.setHours(24));
    switch (reportType) {
      case 'logins':
        this.csvService.exportCSV({
          data: filterByDate(this.loginActivities.data, 'loginTime', dateRange)
            .map(activity => ({ ...activity, androidId: activity.androidId || '' })),
          title: 'Member Visits'
        });
        break;
      case 'resourceViews':
      case 'courseViews':
        this.exportDocView(reportType, dateRange);
        break;
      case 'summary':
        this.csvService.exportSummaryCSV(
          filterByDate(this.loginActivities.data, 'loginTime', dateRange),
          filterByDate(this.resourceActivities.total.data, 'time', dateRange),
          filterByDate(this.courseActivities.total.data, 'time', dateRange),
          this.planetName
        );
        break;
    }
    this.dialogsFormService.closeDialogsForm();
    this.dialogsLoadingService.stop();
  }

  openCourseView(courseId) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId: courseId },
      minWidth: '600px',
      maxWidth: '90vw',
      autoFocus: false
    });
  }

  exportDocView(reportType, dateRange) {
    const data = reportType === 'courseViews' ? this.courseActivities.total.data : this.resourceActivities.total.data;
    this.csvService.exportCSV({
      data: filterByDate(data, 'time', dateRange)
        .map(activity => ({ ...activity, androidId: activity.androidId || '', deviceName: activity.deviceName || '' })),
      title: reportType === 'courseViews' ? 'Course Views' : 'Resource Views'
    });
  }

  goBack() {
    const route = this.codeParam === null ? '../../' : '../';
    this.router.navigate([ route ], { relativeTo: this.route });
  }

  openResourceView(resourceId) {
    this.dialog.open(DialogsResourcesViewerComponent, { data: { resourceId }, autoFocus: false });
  }

  resetDateFilter() {
    this.dateFilterForm.controls.startDate.setValue(this.minDate);
    this.dateFilterForm.controls.endDate.setValue(this.today);
  }
}
