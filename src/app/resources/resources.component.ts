import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError, takeUntil, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { filterSpecificFields, filterDropdowns, composeFilterFunctions } from '../shared/table-helpers';
import { ResourcesService } from './resources.service';
import { Subject } from 'rxjs/Subject';
import { forkJoin } from 'rxjs/observable/forkJoin';
import * as constants from './resources-constants';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-rating {
      max-width: 225px;
    }
    a:hover {
      color: #2196f3;
    }
    .mat-progress-bar {
      height: 10px;
      width: 120px;
    }
  ` ]
})
export class ResourcesComponent implements OnInit, AfterViewInit, OnDestroy {
  resources = new MatTableDataSource();
  pageEvent: PageEvent;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  readonly dbName = 'resources';
  message = '';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  parent = this.route.snapshot.data.parent;
  displayedColumns = this.parent ? [ 'title', 'rating' ] : [ 'select', 'title', 'rating' ];
  getOpts = this.parent ? { domain: this.userService.getConfig().parentDomain } : {};
  subjectList: any = constants.subjectList;
  levelList: any = constants.levelList;
  filter = {
    'subject': '',
    'level': ''
  };
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the resource filter
    this.resources.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
  }

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private httpclient: HttpClient,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private resourcesService: ResourcesService
  ) {}

  ngOnInit() {
    this.resourcesService.resourcesUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((resources) => {
      this.resources.data = resources;
      this.updateAddLibrary();
    });
    this.resourcesService.updateResources({ opts: this.getOpts });
    this.resources.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'title' ]) ]);
    this.resources.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'rating':
          return item.rating.rateSum / item.rating.totalRating;
        default:
          return item[property].toLowerCase();
      }
    };
  }

  setupList(resourcesRes, myLibrarys) {
    this.resources.data = resourcesRes.map((r: any) => {
      const resource = r.doc || r;
      const myLibraryIndex = myLibrarys.findIndex(resourceId => {
        return resource._id === resourceId;
      });
      if (myLibraryIndex > -1) {
        return { ...resource, libraryInfo: true };
      }
      return { ...resource,  libraryInfo: false };
    });
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.resources.data.length;
    return numSelected === numRows;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.data.forEach(row => this.selection.select(row));
  }

  getAddedLibrary() {
    return this.couchService.post('shelf/_find', { 'selector': { '_id': this.userService.get()._id } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of({ docs: [] });
    }));
  }

  // Keeping for reference.  Need to refactor for service.
  /*
  getExternalResources() {
    return this.couchService.post('nations/_find',
    { 'selector': { 'name': this.nationName },
    'fields': [ 'name', 'nationurl' ] })
      .pipe(switchMap(data => {
        this.nationName = data.docs[0].name;
        const nationUrl = data.docs[0].nationurl;
        if (nationUrl) {
          return this.httpclient.jsonp('http://' + nationUrl +
            '/resources/_all_docs?include_docs=true&callback=JSONP_CALLBACK',
            'callback'
          );
        }
        // If there is no url, return an observable of an empty array
        return of([]);
    }));
  }
  */

  deleteClick(resource) {
    this.openDeleteDialog(this.deleteResource(resource), 'single', resource.title);
  }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteResources(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const resource = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteResource(resource);
      displayName = resource.title;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'resource',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete(this.dbName + '/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted resource: ' + resource.title);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  deleteResources(resources) {
    return () => {
      const deleteArray = resources.map((resource) => {
        return { _id: resource._id, _rev: resource._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray })
        .subscribe((data) => {
          this.resourcesService.updateResources({ opts: this.getOpts });
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted all resources');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  addResourceId(resourceId) {
    const resourceIdArray = resourceId.map((data) => {
      return data._id;
    });
    this.couchService.post(`shelf/_find`, { 'selector': { '_id': this.userService.get()._id } })
      .pipe(
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", and it needs to be created
        catchError(err => {
          // Observable of continues stream, send fake response with empty resourceIds array
          return of({ docs: [ { _rev: '', resourceIds: [] } ] });
        }),
        switchMap(data => {
          const oldShelf = data.docs[0];
          const resourceIds = resourceIdArray.concat(oldShelf.resourceIds).reduce(this.dedupeShelfReduce, []);
          return this.couchService.put('shelf/' + this.userService.get()._id,
            Object.assign(oldShelf, { resourceIds }));
        })
      ).subscribe((res) =>  {
        this.updateAddLibrary();
        this.selection.clear();
        this.planetMessageService.showAlert('Resource added to your library');
    }, (error) => (error));
  }

  updateAddLibrary() {
    this.getAddedLibrary().subscribe((res) => {
      this.setupList(this.resources.data, res.docs[0].resourceIds);
    });
  }

  onDropdownFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.resources.filter = this.resources.filter ? this.resources.filter : ' ';
  }

  resetFilter() {
    this.filter = {
      'subject': '',
      'level': ''
    };
    this.titleSearch = '';
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return Object.entries(this.filter).reduce((emptySpace, [ field, val ]) => {
      if (val) {
        return ' ';
      }
      return emptySpace;
    }, '');
  }

}
