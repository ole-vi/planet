import { Component, Input } from '@angular/core';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';


@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html'
})
export class TasksComponent {

  @Input() link: any;
  tasks: any[] = [];

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.tasksService.getTasks(this.link).subscribe((tasks) => {
      this.tasks = this.sortedTasks(tasks);
    });
  }

  addTask() {
    this.tasksService.openAddDialog({ link: this.link }, ({ task, res }) => {
      this.tasks = [ { ...task, ...res }, ...this.tasks ];
      this.planetMessageService.showMessage('New task has been added');
    });
  }

  sortedTasks(tasks) {
    return tasks.sort((a, b) =>
      a.completed > b.completed ?
        1 :
        b.completed > a.completed ?
        -1 :
        new Date(b.deadline) > new Date(a.deadline) ?
        -1 :
        new Date(b.deadline) < new Date(a.deadline) ?
        1 :
        0
    );
  }

}
