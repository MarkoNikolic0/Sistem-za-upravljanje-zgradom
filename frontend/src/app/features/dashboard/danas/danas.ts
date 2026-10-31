import { Component, computed, inject, input, WritableResource } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ProfileResponse } from '../../profile/profile-models';
import { ZgradaService } from '../../zgrade/zgrada-service';
import { ZgradaOsnovno } from '../../zgrade/zgrada-models';
import { KvarService } from '../../kvarovi/kvar-service';
import { GlasanjeService } from '../../glasanje/glasanje-service';
import { SastanakService } from '../../sastanci/sastanak-service';
import { OglasService } from '../../oglasi/oglas-service';
import { uMnozini } from '../../../shared/mnozina';
import { cekaMojGlas, predstoji, zaDanas } from './za-danas';

const NAJVISE_AKTIVNIH = 50;
const BROJ_SASTANAKA = 3;
const BROJ_OGLASA = 3;
const RED_PALJENJA = [4, 9, 1, 7, 11, 2, 6, 10, 0, 5, 8, 3];

@Component({
  selector: 'app-danas',
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule],
  templateUrl: './danas.html',
  styleUrl: './danas.scss',
})
export class Danas {
  readonly profil = input.required<ProfileResponse>();
  readonly zgrade = input.required<ZgradaOsnovno[]>();

  private readonly upravnik = computed(() => this.profil().uloga === 'upravnik');

  protected readonly pregled = inject(ZgradaService).pregled(this.upravnik);
  protected readonly kvarovi = inject(KvarService).najnoviji(1);
  protected readonly glasanja = inject(GlasanjeService).aktivna(NAJVISE_AKTIVNIH);
  protected readonly sastanci = inject(SastanakService).predstojeci(BROJ_SASTANAKA);
  protected readonly oglasi = inject(OglasService).najnoviji(BROJ_OGLASA);

  private readonly resursi = computed((): WritableResource<unknown>[] => [
    ...(this.upravnik() ? [this.pregled] : []),
    this.kvarovi,
    this.glasanja,
    this.sastanci,
    this.oglasi,
  ]);

  protected readonly stiglo = computed(() =>
    this.resursi().every((r) => !r.isLoading() && (r.hasValue() || r.error())),
  );
  protected readonly neucitani = computed(() => this.resursi().filter((r) => r.error()));

  protected readonly potpuno = computed(() => this.neucitani().length === 0);

  protected readonly stavke = computed(() =>
    zaDanas({
      pregled: this.pregled.hasValue() ? (this.pregled.value()[0] ?? null) : null,
      sastanci: this.sastanci.hasValue() ? this.sastanci.value().stavke : [],
      glasanja: this.glasanja.hasValue() ? this.glasanja.value().stavke : [],
      oglasi: this.oglasi.hasValue() ? this.oglasi.value().stavke : [],
    }),
  );
  protected readonly glavna = computed(() => this.stavke()[0]);
  protected readonly sporedne = computed(() => this.stavke().slice(1));

  protected readonly zaGlas = computed(() =>
    this.glasanja.hasValue() ? this.glasanja.value().stavke.filter(cekaMojGlas).length : 0,
  );
  protected readonly sledeciSastanak = computed(() =>
    this.sastanci.hasValue() ? this.sastanci.value().stavke.find((s) => predstoji(s)) : undefined,
  );

  protected readonly nazivZgrade = computed(() =>
    this.zgrade()
      .map((z) => z.naziv)
      .join(' · '),
  );
  protected readonly prozori = computed(() => {
    const upaljeno = this.stavke().length;
    return RED_PALJENJA.map((_, prozor) => RED_PALJENJA.indexOf(prozor) < upaljeno);
  });

  protected readonly uMnozini = uMnozini;

  protected ponovo(): void {
    for (const r of this.neucitani()) {
      r.reload();
    }
  }
}
