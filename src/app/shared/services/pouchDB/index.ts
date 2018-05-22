import { PouchDBService } from './pouchDB.service';
import { AuthService } from './auth.service';

export { PouchDBService } from './pouchDB.service';
export { AuthService } from './auth.service';
export { CoursesService, Course } from './courses.service';

export const SHARED_SERVICES = [ PouchDBService, AuthService ];
