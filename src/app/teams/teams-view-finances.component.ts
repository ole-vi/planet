import { Component, Input, OnChanges, EventEmitter, Output } from '@angular/core';
import { MatTableDataSource, MatDialog } from '@angular/material';
import { Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { TeamsService } from './teams.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  selector: 'planet-teams-view-finances',
  templateUrl: './teams-view-finances.component.html',
  styles: [ `
    .narrow-column {
      max-width: 100px;
    }
  ` ]
})
export class TeamsViewFinancesComponent implements OnChanges {

  @Input() finances: any[] = [];
  @Input() team: any = {};
  @Input() getMembers;
  @Output() financesChanged = new EventEmitter<void>();
  table = new MatTableDataSource();
  displayedColumns = [ 'date', 'description', 'credit', 'debit', 'balance', 'action' ];
  deleteDialog: any;
  dateNow: any;
  startDate: string;
  endDate: string;

  constructor(
    private teamsService: TeamsService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog
  ) {
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
  }

  ngOnChanges() {
    this.transactionFilter();
  }

  transactionFilter() {
    const fromDate = this.startDate || this.team.createdDate;
    const toDate = this.endDate || this.dateNow;
    const financeData = this.finances
      .filter(transaction => transaction.status !== 'archived' && (transaction.date >= fromDate && transaction.date <= toDate))
    // Overwrite values for credit and debit from early document versions on database
      .map(transaction => ({ ...transaction, credit: 0, debit: 0, [transaction.type]: transaction.amount }))
      .sort((a, b) => a.date - b.date).reduce(this.combineTransactionData, []).reverse();
    if (financeData.length === 0) {
      this.table.data = [];
      return;
    }
    const { totalCredits: credit, totalDebits: debit, balance } = financeData[0];
    this.table.data = [ { date: 'Total', credit, debit, balance }, ...financeData ];
  }

  private combineTransactionData(newArray: any[], transaction: any, index: number) {
    const undefinedToNumber = (value: number | undefined) => value || 0;
    const previousValue = index !== 0 ? newArray[index - 1] : { balance: 0, totalCredits: 0, totalDebits: 0 };
    return [
      ...newArray,
      {
        ...transaction,
        balance: previousValue.balance + undefinedToNumber(transaction.credit) - undefinedToNumber(transaction.debit),
        totalCredits: previousValue.totalCredits + undefinedToNumber(transaction.credit),
        totalDebits: previousValue.totalDebits + undefinedToNumber(transaction.debit),
      }
    ];
  }

  openEditTransactionDialog(transaction: any = {}) {
    this.couchService.currentTime().subscribe((time: number) => {
      this.dialogsFormService.openDialogsForm(
        transaction.title ? 'Edit Transaction' : 'Add Transaction',
        [
          {
            name: 'type', placeholder: 'Type', type: 'selectbox',
            options: [ { value: 'credit', name: 'Credit' }, { value: 'debit', name: 'Debit' } ], required: true
          },
          { name: 'description', placeholder: 'Note', type: 'textbox', required: true },
          { name: 'amount', placeholder: 'Amount', type: 'textbox', inputType: 'number', required: true },
          { name: 'date', placeholder: 'Date', type: 'date', required: true }
        ],
        {
          type: [ transaction.type || 'credit', CustomValidators.required ],
          description: [ transaction.description || '', CustomValidators.required ],
          amount: [ transaction.amount || '', [ CustomValidators.required, Validators.min(0) ] ],
          date: [ transaction.date ? new Date(new Date(transaction.date).setHours(0, 0, 0)) : new Date(time), CustomValidators.required ]
        },
        {
          onSubmit: (newTransaction) => this.submitTransaction(newTransaction, transaction).subscribe(() => {
            this.planetMessageService.showMessage('Transaction added');
            this.dialogsFormService.closeDialogsForm();
          })
        }
      );
    });
  }

  submitTransaction(newTransaction, oldTransaction) {
    const { _id: teamId, teamType, teamPlanetCode } = this.team;
    const amount = +(newTransaction.amount);
    const date = new Date(newTransaction.date).getTime();
    const transaction = {
      ...oldTransaction,
      ...newTransaction,
      date,
      amount,
      docType: 'transaction',
      teamId,
      teamType,
      teamPlanetCode
    };
    return this.teamsService.updateTeam(transaction).pipe(map(() => {
      this.financesChanged.emit();
      this.dialogsLoadingService.stop();
    }));
  }

  openArchiveTransactionDialog(transaction) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.archiveTransaction(transaction),
        changeType: 'delete',
        type: 'transaction',
        displayName: transaction.description
      }
    });
  }

  archiveTransaction(transaction) {
    return {
      request: this.submitTransaction(transaction, { status: 'archived' }),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage('You have deleted a transaction.');
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this transaction.')
    };
  }

}
