import { Component, computed, input } from '@angular/core';
import { NAZIVI_STATUSA_KVARA, PromenaStatusaKvara, StatusKvara } from '../../kvar-models';
import { DatePipe } from '@angular/common';

type StanjeKoraka = 'zavrsen' | 'trenutni' | 'sledeci' | 'odbijen' | 'povucen';

interface Korak {
  status: StatusKvara;
  stanje: StanjeKoraka;
  datum?: string;
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
  imports: [DatePipe],
  selector: 'app-tok-kvara',
  styleUrl: './tok-kvara.scss',
  templateUrl: './tok-kvara.html',
})
export class TokKvara {
  readonly status = input.required<StatusKvara>();
  readonly istorija = input.required<PromenaStatusaKvara[]>();

  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;

  protected readonly koraci = computed((): Korak[] => {
    const status = this.status();
    if (status === 'odbijen' || status === 'povucen') {
      const predjeni = REDOSLED.filter((s) => this.datum(s));
      return [
        ...predjeni.map((s): Korak => ({ status: s, stanje: 'zavrsen', datum: this.datum(s) })),
        { status, stanje: status, datum: this.datum(status) },
      ];
    }
    const trenutni = REDOSLED.indexOf(status);
    return REDOSLED.map((s, i) => ({
      status: s,
      stanje:
        i < trenutni || status === 'zatvoren' ? 'zavrsen' : i === trenutni ? 'trenutni' : 'sledeci',
      datum: i <= trenutni ? this.datum(s) : undefined,
    }));
  });

  // Ako je kvar vraćen serviseru, korak je pređen više puta — prikazuje se poslednji put
  private datum(status: StatusKvara): string | undefined {
    return this.istorija()
      .filter((p) => p.status === status)
      .at(-1)?.datum;
  }
}
