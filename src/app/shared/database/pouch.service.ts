import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import PouchDBFind from 'pouchdb-find';
import { throwError, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

PouchDB.plugin(PouchDBAuth);
PouchDB.plugin(PouchDBFind);

@Injectable()
export class PouchService {
  private baseUrl = environment.couchAddress + '/';
  private localDBs = {};
  private authDB;
  private databases = [];

  constructor() {
    this.databases.forEach(db => {
      const pouchDB = new PouchDB(`local-${db}`);

      // indexes the field for faster lookup
      pouchDB.createIndex({
        index: {
          fields: [ 'kind', 'createdAt' ]
        }
      });
      this.localDBs[db] = pouchDB;
    });

    // test is a placeholder temp database
    // we need a central remote database
    // since we will have different levels of authentication (manager, intern)
    // we will have to create corresponding documents in couchdb and we can sync
    // we can decide that when the user is being created for the first time?
    this.authDB = new PouchDB(this.baseUrl + 'test', {
      skip_setup: true
    });
  }

  // @TODO: handle edge cases like offline, duplicate, duplications
  // handle repliction errors or make use of navigator online?
  replicateFromRemoteDBs() {
    this.databases.forEach(db => {
      this.localDBs[db].replicate.from(this.baseUrl + db);
    });
  }

  replicateToRemoteDBs() {
    this.databases.forEach(db => {
      this.localDBs[db].replicate.to(this.baseUrl + db, {
        filter(doc) {
          return doc.pouchIndex === db;
        }
      });
    });
  }

  replicateFromRemoteDB(db) {
    return this.replicate(this.localDBs[db].replicate.from(this.baseUrl + db));
  }

  replicateToRemoteDB(db) {
    return this.replicate(this.localDBs[db].replicate.to(this.baseUrl + db));
  }

  replicate(replicateFn) {
    return from(replicateFn).pipe(catchError(this.handleError));
  }

  getLocalPouchDB(db) {
    return this.localDBs[db];
  }

  getAuthDB() {
    return this.authDB;
  }

  private handleError(err) {
    console.error('An error occurred in PouchDB', err);
    return throwError(err.message || err);
  }

  private docEditingDB(db, id) {
    const name = `${db}_${id}`;
    return this.localDBs[name] !== undefined ? this.localDBs[name] : new PouchDB(name);
  }

  getDocEditing(db, id = 'new') {
    return from(this.docEditingDB(db, id).allDocs({ include_docs: true }))
      .pipe(map((res: any) => {
        const row = res.rows.find((r: any) => r.id === id);
        return row && row.doc;
      }));
  }

  saveDocEditing(doc, db, id = 'new') {
    this.getDocEditing(db, id).subscribe((oldDoc: any) => {
      this.docEditingDB(db, id).put({ ...doc, '_id': id, '_rev': oldDoc && oldDoc._rev });
    });
  }

  deleteDocEditing(db, id = 'new') {
    this.docEditingDB(db, id).destroy();
  }

}
