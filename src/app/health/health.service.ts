import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap, tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HealthService {


  key: string = this.userService.credentials.key;
  iv: string = this.userService.credentials.iv;
  healthData: any = {};

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.userService.userChange$.subscribe(() => {
      this.key = this.userService.credentials.key;
      this.iv = this.userService.credentials.iv;
    });
  }

  getHealthData(userId) {
    const resetHealthData = () => {
      this.healthData = {};
      return of({ profile: {}, events: [] });
    };
    if (this.key === undefined || this.iv === undefined) {
      return resetHealthData();
    }
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key: this.key, iv: this.iv }).pipe(
      tap((response) => this.healthData = response),
      catchError(() => resetHealthData())
    );
  }

  addEvent(_id: string, event: any) {
    return this.postHealthData({ _id, events: [ ...(this.healthData.events || []), event ] });
  }

  postHealthData(data) {
    return (this.key === undefined || this.iv === undefined ?
      this.userService.updateUser({ ...this.userService.get(), key: this.createNewKey(32), iv: this.createNewKey(16) }) :
      of({})
    ).pipe(switchMap(() =>
      this.couchService.put('health/_design/health/_update/encrypt', { ...this.healthData, ...data, key: this.key, iv: this.iv })
    ));
  }

  createNewKey(size: number) {
    if (size % 16 !== 0) {
      console.error('Invalid key size');
      return;
    }
    const hexDigits = '0123456789abcdef';
    const keyArray = new Uint8Array(size);
    window.crypto.getRandomValues(keyArray);

    return keyArray.reduce((hexString, number) => `${hexString}${hexDigits[Math.floor(number / 16)]}${hexDigits[number % 16]}`, '');
  }

}
