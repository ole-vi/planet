import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { ReportsService } from './reports.service';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  myPlanets = [];
  planets = [];
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService
  ) {}

  ngOnInit() {
    this.getMyPlanetList();
  }

  filterData() {
    this.planets = this.planets.map((planet: any) => ({
      ...planet,
      children: this.myPlanets.filter((item: any) => item.createdOn === planet.code || item.parentCode === planet.code)
    }));
  }

  getMyPlanetList() {
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('myplanet_activities')
    ]).subscribe(([ planets, myPlanets ]) => {
      this.planets = [ this.stateService.configuration ].concat(this.reportsService.attachNamesToPlanets(planets));
      this.myPlanets = myPlanets;
      this.filterData();
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

}
