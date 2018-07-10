/* Structure for inputs = [
 *  {
 *    items: { number, fill? },
 *    label
 *  }
 * ]
 */
import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'planet-courses-progress-chart',
  templateUrl: 'courses-progress-chart.component.html',
  styleUrls: [ 'courses-progress-chart.scss' ]
})
export class CoursesProgressChartComponent implements OnChanges {

  @Input() inputs = [];
  @Input() height = 0;
  sets = [];
  horizTotals = [];

  ngOnChanges() {
    const fillEmptyItems = (items) => [].concat(Array(this.height - items.length).fill(''), items);
    this.sets = this.inputs.map(input => ({
      ...input,
      items: fillEmptyItems(input.items),
      total: input.items.reduce((total, item) => total + (item.number || 0), 0)
    }));
    this.horizTotals = this.sets.reduce((totals, set) => {
      return set.items.map((item, index) => (item.number || 0) + (totals[index] || 0));
    }, []);
  }

}
