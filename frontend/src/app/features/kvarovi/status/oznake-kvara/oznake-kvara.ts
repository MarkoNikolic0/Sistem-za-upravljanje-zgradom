import { Component, computed, input } from '@angular/core';
import { TagModule, TagSeverity } from 'primeng/tag';
import { NAZIVI_STATUSA_KVARA, PrioritetKvara, StatusKvara } from '../../kvar-models';

// Bez boje (undefined) Tag dobija primarnu boju teme — zutu
const BOJE_STATUSA: Record<StatusKvara, TagSeverity | undefined> = {
  prijavljen: 'secondary',
  prihvacen: 'info',
  dodeljen: 'info',
  u_toku: undefined,
  resen: 'success',
  zatvoren: 'secondary',
  odbijen: 'danger',
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

  protected readonly naziv = computed(() => NAZIVI_STATUSA_KVARA[this.status()]);
  protected readonly boja = computed(() => BOJE_STATUSA[this.status()]);
  protected readonly hitno = computed(
    () =>
      this.prioritet() === 'hitno' && this.status() !== 'zatvoren' && this.status() !== 'odbijen',
  );
}
