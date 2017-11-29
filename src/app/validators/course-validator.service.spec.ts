import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { CourseValidatorService } from './course-validator.service';
import { HttpModule } from '@angular/http';
describe('CourseValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule, HttpClientModule ],
      providers: [ CourseValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ CourseValidatorService ], (service: CourseValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
