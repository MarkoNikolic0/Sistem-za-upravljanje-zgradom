import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PromenaStatusaKvara } from '../kvar-models';

@Component({
  imports: [DatePipe],
  selector: 'app-razlog-vracanja',
  styleUrl: './razlog-vracanja.scss',
  templateUrl: './razlog-vracanja.html',
})
export class RazlogVracanja {
  readonly vracanje = input.required<PromenaStatusaKvara>();
}
