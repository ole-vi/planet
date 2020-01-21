import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { commonSortingDataAccessor, deepSortingDataAccessor } from '../../shared/table-helpers';
import { ReportsService } from './reports.service';

@Component({
  selector: 'planet-reports-table',
  templateUrl: './reports-table.component.html'
})
export class ReportsTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() planets = [];
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'lastAdminLogin',
    'lastUpgrade',
    'lastSync'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private reportsService: ReportsService
  ) {}

  ngOnInit() {
    this.logs.sortingDataAccessor = (item: any, property: string) => property === 'lastSync' ?
      deepSortingDataAccessor(item, 'doc.lastSync.max.time') :
      commonSortingDataAccessor(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.logs.data = this.planets;
  }

  ngAfterViewInit() {
    this.logs.paginator = this.paginator;
    this.logs.sort = this.sort;
  }

  viewDetails(planet: any) {
    this.reportsService.viewPlanetDetails(planet);
  }

  sortingObject(item, property) {
    return property === 'name' ?
      item.nameDoc || item.doc :
      item;
  }

}
