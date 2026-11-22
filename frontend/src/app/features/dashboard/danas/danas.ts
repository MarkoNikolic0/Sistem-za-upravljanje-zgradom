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
import { uMnozini } from '../../../shared/tekst/mnozina';
import { predstoji, zaDanas } from './za-danas';
import { cekaGlas, NAJVISE_AKTIVNIH } from '../../glasanje/pravila-glasanja';
import { Fasada } from '../fasada/fasada';

const BROJ_SASTANAKA = 3;
const BROJ_OGLASA = 3;

@Component({
  selector: 'app-danas',
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule, Fasada],
  templateUrl: './danas.html',
  styleUrl: './danas.scss',
})
export class Danas {
  readonly profil = input.required<ProfileResponse>();
  readonly zgrade = input.required<ZgradaOsnovno[]>();
  readonly zgrada = input<number | null>(null);

  protected readonly upitZgrade = computed(() => {
    const zgrada = this.zgrada();
    return zgrada === null ? null : { zgrada };
  });

  private readonly upravnik = computed(() => this.profil().uloga === 'upravnik');

  protected readonly pregled = inject(ZgradaService).pregled(this.upravnik);
  private readonly kvarService = inject(KvarService);
  protected readonly kvarovi = this.kvarService.najnoviji(1, this.zgrada);
  private readonly zaPotvrdu = this.kvarService.zaPotvrdu(this.zgrada);
  protected readonly glasanja = inject(GlasanjeService).aktivna(NAJVISE_AKTIVNIH, this.zgrada);
  protected readonly sastanci = inject(SastanakService).predstojeci(BROJ_SASTANAKA, this.zgrada);
  protected readonly oglasi = inject(OglasService).najnoviji(BROJ_OGLASA, this.zgrada);

  private readonly resursi = computed((): WritableResource<unknown>[] => [
    ...(this.upravnik() ? [this.pregled] : []),
    this.kvarovi,
    this.zaPotvrdu,
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
      pregled: this.pregledZgrade(),
      sastanci: this.sastanci.hasValue() ? this.sastanci.value().stavke : [],
      glasanja: this.glasanja.hasValue() ? this.glasanja.value().stavke : [],
      oglasi: this.oglasi.hasValue() ? this.oglasi.value().stavke : [],
      zaPotvrdu: this.zaPotvrdu.hasValue() ? this.zaPotvrdu.value() : null,
    }),
  );
  private readonly pregledZgrade = computed(() => {
    if (!this.pregled.hasValue()) {
      return null;
    }
    const pregled = this.pregled.value();
    const id = this.zgrada();
    return (id === null ? pregled[0] : pregled.find((p) => p.zgrada.id === id)) ?? null;
  });

  protected readonly glavna = computed(() => this.stavke()[0]);
  protected readonly sporedne = computed(() => this.stavke().slice(1));

  protected readonly zaGlas = computed(() =>
    this.glasanja.hasValue() ? this.glasanja.value().stavke.filter(cekaGlas).length : 0,
  );
  protected readonly sledeciSastanak = computed(() =>
    this.sastanci.hasValue() ? this.sastanci.value().stavke.find((s) => predstoji(s)) : undefined,
  );

  protected readonly nazivZgrade = computed(() =>
    this.zgrade()
      .map((z) => z.naziv)
      .join(' · '),
  );

  protected readonly uMnozini = uMnozini;

  protected ponovo(): void {
    for (const r of this.neucitani()) {
      r.reload();
    }
  }
}
