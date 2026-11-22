import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ZgradaService } from '../../zgrade/zgrada-service';
import { zaDanas } from '../danas/za-danas';
import { Fasada } from '../fasada/fasada';
import { PokusajPonovo } from '../../../shared/pokusaj-ponovo';

@Component({
  selector: 'app-zgrade-upravnika',
  imports: [PokusajPonovo, DatePipe, RouterLink, ButtonModule, SkeletonModule, Fasada],
  templateUrl: './zgrade-upravnika.html',
  styleUrl: './zgrade-upravnika.scss',
})
export class ZgradeUpravnika {
  protected readonly pregled = inject(ZgradaService).pregled();

  protected readonly kartice = computed(() =>
    this.pregled.hasValue()
      ? this.pregled.value().map((p) => {
          const stavke = zaDanas({
            pregled: p,
            sastanci: [],
            glasanja: [],
            oglasi: [],
            zaPotvrdu: null,
          });
          return {
            zgrada: p.zgrada,
            sastanak: p.sledeciSastanak,
            stavke,
            hitno: stavke.some((s) => s.hitno),
          };
        })
      : [],
  );
}
