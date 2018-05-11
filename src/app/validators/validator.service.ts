import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';

import { findOneDocument, findDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Injectable()
export class ValidatorService {

constructor(
  private couchService: CouchService,
  private userService: UserService
) {}

  public checkUnique$(db: string, field: string, value: any, opts?: any): Observable<boolean> {
    return this.couchService
      .post(`${db}/_find`, findOneDocument(field, value), opts)
      .pipe(map(data => {
        return data.docs.length > 0;
      }));
  }

  public isUnique$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
    opts: any = {}
  ): Observable<ValidationErrors | null> {
    const { domainControl, ...tempOpts } = opts;
    if (ac.parent && domainControl) {
      const domainCntrl = ac.parent.get(domainControl);
      tempOpts.domain = domainCntrl.value ;
    }

    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.checkUnique$(dbName, fieldName, ac.value, tempOpts)),
      map(exists => {
        if (exists) {
          return { duplicate: true };
        }
        return null;
      })
    ).debug('Checking uniqueness of ' + fieldName + ' in ' + dbName);
  }

  public isNameAvailible$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
    id: string
  ): Observable<ValidationErrors | null> {
    return timer(500).pipe(
      switchMap(() => this.couchService.post(
        `${dbName}/_find`,
        findDocuments(
          { [fieldName] : ac.value },
          [ '_id', fieldName ]
        )
      )),
      map(exists => {
        if (exists.docs.length > 0) {
          return exists.docs.reduce((isMatch, c) => {
            if (id === c._id) {
              return null;
            }
            return isMatch;
          }, { duplicate: true });
        }
      })

    ).debug('Checking availibility of ' + fieldName + ' in ' + dbName);
  }

  public checkOldPassword$(ac: AbstractControl): Observable<boolean> {
    return this.couchService.post('_session', { 'name': this.userService.get().name, 'password': ac.value }, { withCredentials: false })
    .pipe(
      map(data => {
        return null;
      }),
      catchError(err => {
        return of({ invalidOldPassword: true });
      }));
  }

}
