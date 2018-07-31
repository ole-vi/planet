import { Injectable, Inject } from '@angular/core';
import { from, throwError, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PouchService } from './pouch.service';

interface SessionInfo {
  userCtx: {
    name: String;
    roles: String[];
  };
}
@Injectable()
export class PouchAuthService {
  private authDB;

  constructor(private pouchService: PouchService) {
    this.authDB = this.pouchService.getAuthDB();
  }

  getSessionInfo(): Observable<SessionInfo> {
    return from(this.authDB.getSession()).pipe(
      catchError(this.handleError)
    ) as Observable<SessionInfo>;
  }

  login(username, password) {
    return from(this.authDB.logIn(username, password)).pipe(
      catchError(this.handleError)
    );
  }

  signup(username, password, metadata?) {
    return from(this.authDB.signUp(username, password, { metadata })).pipe(
      catchError(this.handleError)
    );
  }

  logout() {
    return from(this.authDB.logOut()).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(err) {
    console.error('An error occured while signing in the user', err);
    return throwError(err.message || err);
  }
}
