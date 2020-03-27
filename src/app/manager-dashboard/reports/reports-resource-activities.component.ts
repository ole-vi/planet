import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor, sortNumberOrString } from '../../shared/table-helpers';
import { ResourcesService } from '../../resources/resources.service';

@Component({
  selector: 'planet-reports-resource-activities',
  templateUrl: './reports-resource-activities.component.html'
})
export class ReportsReportActivitiesComponent implements OnChanges, AfterViewInit {

  @Input() activitiesByDoc = [];
  @Input() ratings = [];
  resourceActivities = new MatTableDataSource();
  displayedColumns = [
    'title',
    'count',
    'value'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private resourcesService: ResourcesService
  ) {}

  ngOnChanges() {
    this.resourceActivities.data = this.activitiesByDoc.map(
      activity => ({ ...(this.ratings.find((rating: any) => rating.item === activity.resourceId)), ...activity })
    );
  }

  ngAfterViewInit() {
    this.resourceActivities.paginator = this.paginator;
    this.resourceActivities.sort = this.sort;
  }

  sortingObject(item, property) {
    return property === 'title' ? item.max : item;
  }

}
