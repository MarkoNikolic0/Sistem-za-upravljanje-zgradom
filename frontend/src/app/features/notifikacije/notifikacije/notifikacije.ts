import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { IKONICE_NOTIFIKACIJA, Notifikacija } from '../notifikacija-models';
import { notifikacijeFeature } from '../notifikacija-store/notifikacije-reducer';
import { NotifikacijeActions } from '../notifikacija-store/notifikacije-actions';
import { selectGrupe } from '../notifikacija-store/notifikacije-selectors';

@Component({
  selector: 'app-notifikacije',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    MessageModule,
    SelectButtonModule,
    SkeletonModule,
  ],
  templateUrl: './notifikacije.html',
  styleUrl: './notifikacije.scss',
})
export class Notifikacije {
  private store = inject(Store);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private readonly fokusiraj = fokusPosleCrtanja();
  private poslednjiPreUcitavanja: number | null = null;

  protected readonly ikonice = IKONICE_NOTIFIKACIJA;
  protected readonly filteri = [
    { label: 'Sve', value: false },
    { label: 'Nepročitana', value: true },
  ];

  protected readonly stavke = this.store.selectSignal(notifikacijeFeature.selectStavke);
  protected readonly status = this.store.selectSignal(notifikacijeFeature.selectStatus);
  protected readonly samoNeprocitane = this.store.selectSignal(
    notifikacijeFeature.selectSamoNeprocitane,
  );
  protected readonly preostaloStarijih = this.store.selectSignal(
    notifikacijeFeature.selectPreostaloStarijih,
  );
  protected readonly ucitavaStarije = this.store.selectSignal(
    notifikacijeFeature.selectUcitavaStarije,
  );
  protected readonly greska = this.store.selectSignal(notifikacijeFeature.selectGreska);
  protected readonly brojNeprocitanih = this.store.selectSignal(
    notifikacijeFeature.selectBrojNeprocitanih,
  );

  protected readonly grupe = this.store.selectSignal(selectGrupe);

  constructor() {
    this.otvori(false);
    inject(DestroyRef).onDestroy(() => this.store.dispatch(NotifikacijeActions.listaZatvorena()));
    effect(() => {
      if (!this.ucitavaStarije()) {
        untracked(() => this.fokusirajPrvuNovu());
      }
    });
  }

  protected otvori(samoNeprocitane: boolean): void {
    this.store.dispatch(NotifikacijeActions.listaOtvorena({ samoNeprocitane }));
  }

  protected ucitajStarije(): void {
    this.poslednjiPreUcitavanja = this.stavke().at(-1)?.id ?? null;
    this.store.dispatch(NotifikacijeActions.ucitajStarije());
  }

  private fokusirajPrvuNovu(): void {
    const poslednji = this.poslednjiPreUcitavanja;
    this.poslednjiPreUcitavanja = null;
    if (poslednji === null) {
      return;
    }
    afterNextRender(
      () => {
        const stavke = [...this.host.nativeElement.querySelectorAll<HTMLElement>('li[data-id]')];
        const indeks = stavke.findIndex((li) => li.dataset['id'] === String(poslednji));
        stavke[indeks + 1]?.focus();
      },
      { injector: this.injector },
    );
  }

  protected procitaj(notifikacija: Notifikacija): void {
    this.store.dispatch(NotifikacijeActions.procitaj({ notifikacija }));
  }

  protected oznaci(notifikacija: Notifikacija): void {
    this.procitaj(notifikacija);
    this.fokusiraj(`li[data-id="${notifikacija.id}"]`);
  }

  protected procitajSve(): void {
    this.store.dispatch(NotifikacijeActions.procitajSve());
    this.fokusiraj('#notifikacije-naslov');
  }
}
