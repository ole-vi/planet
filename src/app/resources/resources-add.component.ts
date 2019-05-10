import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import * as constants from './resources-constants';
import * as JSZip from 'jszip/dist/jszip.min';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { debug } from '../debug-operator';

import Mime from 'mime/Mime';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
const mime = new Mime(require('mime/types/standard.json'));
import { languages } from '../shared/languages';
import { ResourcesService } from './resources.service';
import { TagsService } from '../shared/forms/tags.service';

@Component({
  templateUrl: './resources-add.component.html'
})

export class ResourcesAddComponent implements OnInit {
  constants = constants;
  file: any;
  existingResource: any = {};
  deleteAttachment = false;
  resourceForm: FormGroup;
  readonly dbName = 'resources'; // make database name a constant
  userDetail: any = {};
  pageType = 'Add new';
  disableDownload = true;
  disableDelete = true;
  resourceFilename = '';
  languages = languages;
  tags = this.fb.control([]);

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private resourcesService: ResourcesService,
    private tagsService: TagsService
  ) {
    // Adds the dropdown lists to this component
    Object.assign(this, constants);
    this.createForm();
    this.resourceForm.setValidators(() => {
      if (this.file && this.file.size / 1024 / 1024 > 512) {
        return { 'fileTooBig': true };
      } else {
        return null;
      }
    });
  }

  ngOnInit() {
    this.userDetail = this.userService.get();
    this.resourcesService.requestResourcesUpdate(false, false);
    if (this.route.snapshot.url[0].path === 'update') {
      this.resourcesService.resourcesListener(false).pipe(first())
        .subscribe((resources: any[]) => {
          this.pageType = 'Update';
          const resource = resources.find(r => r._id === this.route.snapshot.paramMap.get('id'));
          this.existingResource = resource;
          // If the resource does not have an attachment, disable file downloadable toggle
          this.disableDownload = !resource.doc._attachments;
          this.disableDelete = !resource.doc._attachments;
          this.resourceFilename = resource.doc._attachments ? Object.keys(this.existingResource.doc._attachments)[0] : '';
          this.resourceForm.patchValue(resource.doc);
          this.tags.setValue(resource.tags.map((tag: any) => tag._id));
        }, (error) => {
          console.log(error);
        });
    }
  }

  createForm() {
    this.resourceForm = this.fb.group({
      title: [
        '',
        CustomValidators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
          ? ac => this.validatorService.isNameAvailible$(this.dbName, 'title', ac, this.route.snapshot.params.id)
          : ac => this.validatorService.isUnique$(this.dbName, 'title', ac)
      ],
      author: '',
      year: '',
      description: [ '', CustomValidators.required ],
      language: '',
      publisher: '',
      linkToLicense: '',
      subject: [ '', Validators.required ],
      level: [ '', Validators.required ],
      openWith: '',
      resourceFor: [],
      medium: '',
      resourceType: '',
      addedBy: '',
      openWhichFile: '',
      isDownloadable: '',
      sourcePlanet: this.stateService.configuration.code,
      resideOn: this.stateService.configuration.code,
      createdDate: this.couchService.datePlaceholder,
      updatedDate: this.couchService.datePlaceholder
    });
  }

  // Function which takes a MIME Type as a string and returns whether the file is an
  // image, audio file, video, pdf, or zip.  If none of those five returns 'other'
  private simpleMediaType(mimeType: string) {
    const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
    return mediaTypes.find((type) => mimeType.indexOf(type) > -1) || 'other';
  }

  private singleAttachment(file, mediaType) {
    const resource = {
      filename: file.name,
      mediaType: mediaType,
      _attachments: {}
    };
    return of({ resource, file });
  }

  onSubmit() {
    if (this.resourceForm.valid) {
      const fileObs: Observable<any> = this.createFileObs();
      fileObs.pipe(debug('Preparing file for upload')).subscribe(({ resource, file }) => {
        const { _id, _rev } = this.existingResource.doc;
        // If we are removing the attachment, only keep id and rev from existing resource.  Otherwise use all props
        const existingData = this.deleteAttachment ? { _id, _rev } : this.existingResource.doc;
        // Start with empty object so this.resourceForm.value does not change
        const newResource = Object.assign({}, existingData, this.resourceForm.value, resource);
        const message = newResource.title + (this.pageType === 'Update' ?  ' Updated Successfully' : ' Added');
        this.updateResource(newResource).pipe(switchMap(([ resourceRes, tagsRes ]) => {
          return file ?
            this.couchService.putAttachment(
              this.dbName + '/' + resourceRes.id + '/' + file.name + '?rev=' + resourceRes.rev, file,
              { headers: { 'Content-Type': file.type } }
            ) :
            of({});
        })).subscribe(() => {
          this.router.navigate([ '/resources' ]);
          this.planetMessageService.showMessage(message);
        }, (err) => this.planetMessageService.showAlert('There was an error with this resource'));
      });
    } else {
      Object.keys(this.resourceForm.controls).forEach(field => {
        const control = this.resourceForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  createFileObs() {
    // If file doesn't exist, mediaType will be undefined
    const mediaType = this.file && this.simpleMediaType(this.file.type);
    switch (mediaType) {
      case undefined:
        // Creates an observable that immediately returns an empty object
        return of({ resource: {} });
      case 'zip':
        return this.zipObs(this.file);
      default:
        return this.singleAttachment(this.file, mediaType);
    }
  }

  updateResource(resourceInfo) {
    return forkJoin([
      this.couchService.updateDocument(this.dbName, { ...resourceInfo, updatedDate: this.couchService.datePlaceholder }),
      this.couchService.bulkDocs(
        'tags',
        this.tagsService.tagBulkDocs(this.existingResource._id, this.dbName, this.tags.value, this.existingResource.tags)
      )
    ]);
  }

  deleteAttachmentToggle(event) {
    this.deleteAttachment = event.checked;
    // Also disable downloadable toggle if user is removing file
    this.disableDownload = event.checked;
    this.resourceForm.patchValue({ isDownloadable: false });
  }

  // Returns a function which takes a file name located in the zip file and returns an observer
  // which resolves with the file's data
  private processZip(zipFile) {
    return function(fileName) {
      return Observable.create((observer) => {
        // When file was not read error block wasn't called from async so added try...catch block
        try {
          zipFile.file(fileName).async('base64').then(function success(data) {
            observer.next({ name: fileName, data: data });
            observer.complete();
          }, function error(e) {
            observer.error(e);
          });
        } catch (e) {
          console.log(fileName + ' has caused error.');
          observer.error(e);
        }
      });
    };
  }

  zipObs(zipFile) {
    const zip = new JSZip();
    return Observable.create((observer) => {
      // This loads an object with file information from the zip, but not the data of the files
      zip.loadAsync(zipFile).then((data) => {
        const fileNames = [];
        // Add file names to array for mapping
        for (const path in data.files) {
          if (!data.files[path].dir && path.indexOf('DS_Store') === -1) {
            fileNames.push(path);
          }
        }
        // Since files are loaded async, use forkJoin Observer to ensure all data from the files are loaded before attempting upload
        forkJoin(fileNames.map(this.processZip(zip))).pipe(debug('Unpacking zip file')).subscribe((filesArray) => {
          // Create object in format for multiple attachment upload to CouchDB
          const filesObj = filesArray.reduce((newFilesObj: any, file: any) => {
            // Default to text/plain if no mime type found
            const fileType = mime.getType(file.name) || 'text/plain';
            newFilesObj[file.name] = { data: file.data, content_type: fileType };
            return newFilesObj;
          }, {});
          // Leave filename blank (since it is many files) and call mediaType 'HTML'
          observer.next({ resource: { filename: '', mediaType: 'HTML', _attachments: filesObj } });
          observer.complete();
        }, (error) => {
          console.log(error);
          observer.error(error);
        });
      });
    });
  }

  cancel() {
    this.router.navigate([ '/resources' ]);
  }

  bindFile(event) {
    this.file = event.target.files[0];
    this.disableDownload = false;
    this.disableDelete = false;
    this.resourceForm.updateValueAndValidity();
  }

}
