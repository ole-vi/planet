import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesComponent } from './courses.component';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { CourseValidatorService } from '../validators/course-validator.service';
import { FormErrorMessagesComponent } from '../shared/form-error-messages.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../shared/material.module';
import { By } from '@angular/platform-browser';

describe('CoursesComponent', () => {
  let component: CoursesComponent;
  // let component1: DialogsDeleteComponent;
  let fixture: ComponentFixture<CoursesComponent>;
  // let fixture1: ComponentFixture<DialogsDeleteComponent>;
  let statusElement;
  // let statusElement1;
  let couchService;
  let getSpy: any;
  let deleteSpy: any;
  let de;
  // let de1;
  let coursedata1;
  let coursedata2;
  let coursearray;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, RouterTestingModule, HttpClientModule, MaterialModule ],
      declarations: [ CoursesComponent, FormErrorMessagesComponent, DialogsDeleteComponent ],
      providers: [ CouchService, CourseValidatorService ]
      });

    fixture = TestBed.createComponent(CoursesComponent);
    component = fixture.componentInstance;
      // fixture1 = TestBed.createComponent(DialogsDeleteComponent);
      // component1 = fixture1.componentInstance;
    de = fixture.debugElement;
      // de1 = fixture1.debugElement;
    couchService = fixture.debugElement.injector.get(CouchService);
    statusElement = de.nativeElement.querySelector('.km-course-title');
    coursedata1 = { _id: '1', _rev: 'd5857e866c', title: 'OLE Test 1', description: 'English Language Test' };
    coursedata2 = { _id: '2', _rev: '66756fa21', title: 'Git Quiz', description: 'Git Operation Test' };
    coursearray = { rows: [ { doc: coursedata1 }, { doc: coursedata2 } ] };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // test getCourses()
  it('should make a get request to couchService', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve());
    component.getCourses();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(getSpy).toHaveBeenCalledWith('courses/_all_docs?include_docs=true');
    });
  });

  it('should show getCourses', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(coursedata1));
    component.getCourses();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('OLE Test 1');
    });
  });

  // test ngAfterViewInit()
  it('should ngAfterViewInit', () => {
    component.ngAfterViewInit();
    expect(component.courses.sort).toEqual(component.sort);
    expect(component.courses.paginator).toEqual(component.paginator);
  });

  // searchFilter()
  it('should searchFilter', () => {
    component.searchFilter('OLE');
    expect(component.courses.filter).toEqual('OLE'.trim().toLowerCase());
  });

  // deleteClick()
  /*
  it('should deleteClick', () =>{
    //try to add a tag to <p class="km-course-name'>{{data.displayName}}</p> in dialogs-delete.component.html
    const statusElement1=de1.nativeElement.querySelector('.km-course-name');
    component.deleteClick(coursedata1);
    fixture.whenStable().then(() =>{
      fixture.detectChanges();
      expect(statusElement1.textContent).toEqual('OLE Test 1');
    });
  });
  */
  // deleteCourse()
  it('should make a delete request to couchService', () => {
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(deleteSpy).toHaveBeenCalledWith('courses/' + coursedata1._id + '?rev=' + coursedata1._rev);
    });
  });

  it('should deleteCourse', () => {
    deleteSpy = spyOn(couchService, 'delete').and.returnValue(Promise.resolve(coursearray));
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.courses.data).toBe(component.courses.data.filter((coursedata1)));
    });
  });

  it('should show There was an error message deleting course', () => {
    deleteSpy = spyOn(couchService, 'delete').and.returnValue(Promise.reject({}));
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.deleteDialog.componentInstance.message).toBe('There was a problem deleting this course');
    });
  });
});
