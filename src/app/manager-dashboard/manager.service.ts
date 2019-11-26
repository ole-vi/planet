import { Injectable } from '@angular/core';
import { of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { ReportsService } from './reports/reports.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {

  private configuration = this.stateService.configuration;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private activityService: ReportsService
  ) {}

  addAdminLog(type) {
    const log = {
      createdOn: this.configuration.code,
      parentCode: this.configuration.parentCode,
      user: this.userService.get().name,
      time: this.couchService.datePlaceholder
    };
    return this.couchService.updateDocument('admin_activities', { ...log, type });
  }

  getLogs(tillDate?: number) {
    const configuration = this.configuration;
    return this.activityService.getTotalUsers(configuration.code, true).pipe(switchMap(() =>
      forkJoin([
        this.activityService.getGroupedReport('logins', { planetCode: configuration.code, tillDate }),
        this.activityService.getAdminActivities(configuration.code, tillDate),
        this.activityService.getGroupedReport('resourceViews', { planetCode: configuration.code, tillDate, filterAdmin: true }),
        this.activityService.getRatingInfo({ planetCode: configuration.code, tillDate, filterAdmin: true })
      ])
    )).pipe(map(([ loginActivities, adminActivities, resourceVisits, ratings ]) => {
      return ({
        resourceVisits: resourceVisits.byResource.reduce((total, visit) => total + visit.count, 0),
        ratings: ratings.reduce((total, rating) => total + rating.count, 0),
        ...this.activityService.mostRecentAdminActivities(configuration, loginActivities.byUser, adminActivities)
      });
    }));
  }

  getPushedList() {
    return this.couchService.findAll(
      'send_items',
      findDocuments({ 'sendTo': this.configuration.code }),
      { domain: this.configuration.parentDomain }
    );
  }

  createPin() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  getChildPlanets(onlyAccepted = false) {
    const selector = onlyAccepted ?
      { '$or': [
        { 'parentCode': this.stateService.configuration.code, 'registrationRequest': 'accepted' },
        { 'docType': 'parentName' }
      ] } :
      { '_id': { '$gt': null } };
    return this.couchService.findAll('communityregistrationrequests',
      findDocuments(selector, 0, [ { 'createdDate': 'desc' } ] ));
  }

  getHubChilds(spokes) {
    return this.couchService.findAll('communityregistrationrequests',
      findDocuments({ 'code': { '$in': spokes } }, 0, [ { 'createdDate': 'desc' } ] ),
      { domain: this.stateService.configuration.parentDomain }
    );
  }

  updateCredentialsYml({ name, password }) {
    if (environment.production === true) {
      const opts = {
        responseType: 'text',
        withCredentials: false,
        headers: { 'Content-Type': 'text/plain' }
      };
      return this.couchService.getUrl('updateyml?u=' + name + ',' + password, opts);
    }
    return of({});
  }

  getVersion(app: 'planet' | 'myPlanet', opts: any = {}) {
    return this.couchService.getUrl(`${app === 'myPlanet' ? 'apk' : ''}version`, opts).pipe(catchError(() => of('N/A')));
  }

  getApkLatestVersion(opts: any = {}) {
    return this.couchService.getUrl('versions', opts).pipe(
      map((response: any) => JSON.parse(response)),
      catchError(() => of({}))
    );
  }

}
