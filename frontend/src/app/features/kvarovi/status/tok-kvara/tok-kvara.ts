import { Component, computed, input } from '@angular/core';
import { NAZIVI_STATUSA_KVARA, PromenaStatusaKvara, StatusKvara } from '../../kvar-models';
import { DatePipe } from '@angular/common';
import { KORACI_KVARA } from '../../izgled-kvara';

type StanjeKoraka = 'zavrsen' | 'trenutni' | 'sledeci' | 'odbijen' | 'povucen';

interface Korak {
  status: StatusKvara;
  stanje: StanjeKoraka;
  datum?: string;
}

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
      const predjeni = KORACI_KVARA.filter((s) => s === 'prijavljen' || this.datum(s));
      return [
        ...predjeni.map((s): Korak => ({ status: s, stanje: 'zavrsen', datum: this.datum(s) })),
        { status, stanje: status, datum: this.datum(status) },
      ];
    }
    const trenutni = KORACI_KVARA.indexOf(status);
    return KORACI_KVARA.map((s, i) => ({
      status: s,
      stanje:
        i < trenutni || status === 'zatvoren' ? 'zavrsen' : i === trenutni ? 'trenutni' : 'sledeci',
      datum: i <= trenutni ? this.datum(s) : undefined,
    }));
  });

  private datum(status: StatusKvara): string | undefined {
    return this.istorija()
      .filter((p) => p.status === status)
      .at(-1)?.datum;
  }
}
