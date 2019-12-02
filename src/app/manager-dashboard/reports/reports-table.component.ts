import { Component, Input, ViewChild, OnChanges, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor } from '../../shared/table-helpers';
import { ReportsService } from './reports.service';

@Component({
  selector: 'planet-reports-table',
  templateUrl: './reports-table.component.html'
})
export class ReportsTableComponent implements OnChanges, AfterViewInit {

  @Input() planets = [];
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'lastAdminLogin',
    'lastUpgrade',
    'lastSync',
    'lastSyncTime'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private reportsService: ReportsService
  ) {}

  ngOnChanges() {
    this.logs.data = this.planets;
    this.logs.sortingDataAccessor = (item: any, property: string) =>
      commonSortingDataAccessor(
        property === 'name' ?
          item.nameDoc || item.doc :
          item,
        property
      );
  }

  ngAfterViewInit() {
    this.logs.paginator = this.paginator;
    this.logs.sort = this.sort;
  }

  viewDetails(planet: any) {
    this.reportsService.viewPlanetDetails(planet);
  }

}
