import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  constructor(
    private couchService: CouchService
  ) {}

  groupBy(array, fields, { sumField = '', maxField = '' } = {}) {
    return array.reduce((group, item) => {
      const currentValue = group.find((groupItem) => fields.every(field => groupItem[field] === item[field]));
      if (currentValue) {
        currentValue.count = currentValue.count + 1;
        currentValue.sum = sumField ? currentValue[sumField] + item[sumField] : 0;
        currentValue.max = maxField ?
          (currentValue.max[maxField] < item[maxField] ? item : currentValue.max) :
          {};
      } else {
        const newEntry = fields.reduce((newObj, field) => {
          newObj[field] = item[field];
          return newObj;
        }, {});
        group.push({ ...newEntry, count: 1, sum: sumField ? item[sumField] : 0, max: item });
      }
      return group;
    }, []);
  }

  selector(planetCode?: string) {
    return planetCode ? findDocuments({ 'createdOn': planetCode }) : undefined;
  }

  getTotalUsers(planetCode?: string) {
    const obs = planetCode ? this.couchService.findAll('_users') :
      this.couchService.findAll('child_users').pipe(map((users: any) => users.filter(user => user.planetCode === planetCode)));
    return obs.pipe(map((users: any) => {
      return ({
        count: users.length,
        byGender: users.reduce((usersByGender: any, user: any) => {
          usersByGender[user.gender || 'undeclared'] += 1;
          return usersByGender;
        }, { 'male': 0, 'female': 0, 'undeclared': 0 })
      });
    }));
  }

  getLoginActivities(planetCode?: string) {
    return this.couchService.findAll('login_activities', this.selector(planetCode)).pipe(map((loginActivities: any) => {
      return this.groupBy(loginActivities, [ 'parentCode', 'createdOn', 'user' ], { maxField: 'loginTime' })
        .sort((a, b) => b.count - a.count);
    }));
  }

  getRatingInfo(planetCode?: string) {
    return this.couchService.findAll('ratings', this.selector(planetCode)).pipe(map((ratings: any) => {
      return this.groupBy(ratings, [ 'type', 'item' ], { sumField: 'rate' })
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).map((r: any) => ({ ...r, value: r.sum / r.count }));
    }));
  }

  getResourceVisits(planetCode?: string) {
    return this.couchService.findAll('resource_activities', this.selector(planetCode)).pipe(map((resourceActivites) => {
      return this.groupBy(resourceActivites, [ 'parentCode', 'createdOn', 'resource' ]);
    }));
  }

  getDatabaseCount(db: string) {
    return this.couchService.get(db + '/_design_docs').pipe(map((res: any) => {
      return res.total_rows - res.rows.length;
    }));
  }

  getAdminActivities(planetCode?: string) {
    return this.couchService.findAll('activity_logs', this.selector(planetCode)).pipe(map(adminActivities => {
      return this.groupBy(adminActivities, [ 'parentCode', 'createdOn', 'type' ], { maxField: 'createdTime' });
    }));
  }

}
