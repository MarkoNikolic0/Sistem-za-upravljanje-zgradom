import { Component, computed, input } from '@angular/core';
import { NAZIVI_STATUSA_KVARA, StatusKvara } from '../kvar-models';

type StanjeKoraka = 'zavrsen' | 'trenutni' | 'sledeci' | 'odbijen';

interface Korak {
  status: StatusKvara;
  stanje: StanjeKoraka;
}

const REDOSLED: StatusKvara[] = [
  'prijavljen',
  'prihvacen',
  'dodeljen',
  'u_toku',
  'resen',
  'zatvoren',
];

@Component({
  selector: 'app-tok-kvara',
  styleUrl: './tok-kvara.scss',
  templateUrl: './tok-kvara.html',
})
export class TokKvara {
  readonly status = input.required<StatusKvara>();

  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;

  protected readonly koraci = computed((): Korak[] => {
    const status = this.status();
    if (status === 'odbijen') {
      return [
        { status: 'prijavljen', stanje: 'zavrsen' },
        { status: 'odbijen', stanje: 'odbijen' },
      ];
    }
    const trenutni = REDOSLED.indexOf(status);
    return REDOSLED.map((s, i) => ({
      status: s,
      stanje:
        i < trenutni || status === 'zatvoren' ? 'zavrsen' : i === trenutni ? 'trenutni' : 'sledeci',
    }));
  });
}
