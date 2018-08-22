import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { findDocuments } from '../shared/mangoQueries';

@Injectable()
export class SubmissionsService {

  // Currently there are separate observables for the single submission for a specific exam
  // and an array of submissions for the list of submissions
  private submissionsUpdated = new Subject<any[]>();
  submissionsUpdated$ = this.submissionsUpdated.asObservable();
  submissions = [];
  submission: any;
  private submissionUpdated = new Subject<any>();
  submissionUpdated$ = this.submissionUpdated.asObservable();
  submissionAttempts = 0;

  constructor(
    private couchService: CouchService,
  ) { }

  updateSubmissions({ query, opts = {}, parentId }: { parentId?: string, opts?: any, query?: any } = {}) {
    this.getSubmissions(query, opts).subscribe((submissions: any) => {
      this.submissions = parentId ? this.filterSubmissions(submissions, parentId) : submissions;
      this.submissionsUpdated.next(this.submissions);
    }, (err) => console.log(err));
  }

  getSubmissions(query: any = { 'selector': {} }, opts: any = {}) {
    return this.couchService.findAll('submissions', query, opts);
  }

  setSubmission(id: string) {
    this.submission = this.submissions.find((submission) => {
      return submission._id === id;
    });
  }

  private newSubmission({ parentId, parent, user, type }) {
    this.submission = this.createNewSubmission({ parentId, parent, user, type });
  }

  private createNewSubmission({ parentId, parent, user, type }) {
    return { parentId, parent, user, type, answers: [], grade: 0, status: 'pending', source: user.planetCode };
  }

  openSubmission({ parentId = '', parent = '', user = '', type = '', submissionId = '', status = 'pending' }) {
    const selector = submissionId ? { '_id': submissionId } : { parentId, user };
    this.couchService.post('submissions/_find', { selector })
      .subscribe((res) => {
        let attempts = res.docs.length - 1;
        const bestAttempt = res.docs.reduce((best: any, submission: any) =>
          submission.grade > best.grade ? submission : best, res.docs[0]);
        this.submission = res.docs.find(submission => submission.status === status);
        if (this.submission === undefined) {
          attempts += 1;
          this.newSubmission({ parentId, parent, user, type });
        }
        this.submissionAttempts = attempts;
        this.submissionUpdated.next({ submission: this.submission, attempts, bestAttempt });
      });
  }

  submitAnswer(answer, correct: boolean, index: number, close: boolean) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    const oldAnswer = submission.answers[index];
    submission.answers[index] = {
      value: answer,
      mistakes: (oldAnswer ? oldAnswer.mistakes : 0) + (correct === false ? 1 : 0),
      passed: correct !== false
    };
    if (correct !== undefined) {
      this.updateGrade(submission, correct ? 1 : 0, index);
    }
    return this.updateSubmission(submission, this.submission.type === 'exam', close);
  }

  submitGrade(grade, index: number, close) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    this.updateGrade(submission, grade, index);
    return this.updateSubmission(submission, false, close);
  }

  updateGrade(submission, grade, index) {
    submission.answers[index].grade = grade;
    submission.grade = this.calcTotalGrade(submission);
  }

  updateStatus(submission: any) {
    const statusProgression = new Map([ [ 'pending', 'complete' ], [ 'complete', 'graded' ] ]);
    return statusProgression.get(submission.status) || 'graded';
  }

  calcTotalGrade(submission: any) {
    return submission.answers.reduce((total: number, answer: any, index: number) =>
      total + (submission.parent.questions[index].marks * (answer.grade || 0)), 0);
  }

  updateSubmission(submission: any, takingExam: boolean, close: boolean) {
    submission.status = close ? this.updateStatus(submission) : submission.status;
    return this.couchService.post('submissions', submission).pipe(map((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete' && takingExam) {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
    }));
  }

  filterSubmissions(submissions, parentId) {
    return submissions.filter(s => s.parentId === parentId).reduce((subs, submission) => {
      const userSubmissionIndex = subs.findIndex((s) => s.user === submission.user);
      if (userSubmissionIndex !== -1) {
        const oldSubmission = subs[userSubmissionIndex];
        subs[userSubmissionIndex] = this.calcTotalGrade(submission) > this.calcTotalGrade(oldSubmission) ?
          submission : oldSubmission;
      } else {
        subs.push(submission);
      }
      return subs;
    }, []);
  }

  sendSubmissionRequests(users: string[], { parentId, parent }) {
    return this.couchService.post('submissions/_find', findDocuments({
      parentId,
      '$or': users.map((user: any) => ({ 'user._id': user._id, 'source': user.planetCode }))
    })).pipe(
      switchMap((submissions: any) => {
        const newSubmissionUsers = users.filter((user: any) => submissions.docs.findIndex((s: any) => s.user._id === user._id) === -1);
        const newSubmissions = newSubmissionUsers.map((user) => this.newSubmission({ user, parentId, parent, type: 'survey' }));
        console.log(newSubmissions);
        return this.couchService.post('submissions/_bulk_docs', {
          'docs': newSubmissionUsers.map((user) => this.createNewSubmission({ user, parentId, parent, type: 'survey' }))
        });
      })
    );
  }

}
