import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { sortNumberOrString } from '../../shared/table-helpers';
import { ReportsDetailData } from './reports-detail-data';

@Component({
  selector: 'planet-reports-detail-activities',
  templateUrl: './reports-detail-activities.component.html'
})
export class ReportsDetailActivitiesComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  @Input() progress = { enrollments: new ReportsDetailData('time'), completions: new ReportsDetailData('time') };
  @Input() activityType: 'resources' | 'courses' = 'resources';
  @Output() itemClick = new EventEmitter<any>();
  activities = new MatTableDataSource();
  displayedColumns = [
    'title',
    'count',
    'averageRating'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor() {}

  ngOnInit() {
    this.displayedColumns = [ ...this.displayedColumns, ...(this.activityType === 'courses' ? [ 'enrollments', 'completions' ] : []) ];
    this.activities.sortingDataAccessor = (item: any, property: string) =>
      sortNumberOrString(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.activities.data = this.activitiesByDoc.map(activity => {
      return {
        averageRating: (this.ratings.find((rating: any) => rating.item === (activity.resourceId || activity.courseId)) || {}).value,
        enrollments: this.progress.enrollments.filteredData.filter(enrollment => enrollment.courseId === activity.courseId).length,
        completions: this.progress.completions.filteredData.filter(completion => completion.courseId === activity.courseId).length,
        ...activity
      };
    });
  }

  ngAfterViewInit() {
    this.activities.paginator = this.paginator;
    this.activities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

  rowClick(element) {
    this.itemClick.emit(element.resourceId || element.courseId);
  }

}
