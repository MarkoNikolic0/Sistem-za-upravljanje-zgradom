import { Component, computed, input } from '@angular/core';
import { TagModule, TagSeverity } from 'primeng/tag';
import { NAZIVI_STATUSA_KVARA, PrioritetKvara, StatusKvara } from '../../kvar-models';
import { stanjeRoka, StanjeRoka } from '../../pravila-kvara';

const BOJE_STATUSA: Record<StatusKvara, TagSeverity | undefined> = {
  prijavljen: 'secondary',
  prihvacen: 'info',
  dodeljen: 'info',
  u_toku: undefined,
  resen: 'success',
  zatvoren: 'secondary',
  odbijen: 'danger',
};

const OZNAKE_ROKA: Record<StanjeRoka, { tekst: string; boja: TagSeverity }> = {
  prekoracen: { tekst: 'Rok prekoračen', boja: 'danger' },
  danas: { tekst: 'Rok ističe danas', boja: 'warn' },
  sutra: { tekst: 'Rok ističe sutra', boja: 'warn' },
};

@Component({
  imports: [TagModule],
  selector: 'app-oznake-kvara',
  templateUrl: './oznake-kvara.html',
  host: { class: 'flex flex-wrap gap-2' },
})
export class OznakeKvara {
  readonly status = input.required<StatusKvara>();
  readonly prioritet = input.required<PrioritetKvara>();
  readonly rok = input.required<string>();

  protected readonly naziv = computed(() => NAZIVI_STATUSA_KVARA[this.status()]);
  protected readonly boja = computed(() => BOJE_STATUSA[this.status()]);
  protected readonly hitno = computed(
    () =>
      this.prioritet() === 'hitno' && this.status() !== 'zatvoren' && this.status() !== 'odbijen',
  );
  protected readonly oznakaRoka = computed(() => {
    const stanje = stanjeRoka(this.status(), this.rok());
    return stanje ? OZNAKE_ROKA[stanje] : null;
  });
}
