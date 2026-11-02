import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { uMnozini } from '../../../shared/mnozina';
import { Poruka } from '../../../shared/poruka';
import { formatirajTelefon } from '../../../shared/telefon';
import { injectZgradeUpravnika } from '../../zgrade/zgrade-korisnika';
import { StanSaStanarima, Stanar } from '../stanari-models';
import { StanariService } from '../stanari-service';
import { pretraziStanove } from '../pretraga-stanara';

interface Sprat {
  sprat: number;
  stanovi: StanSaStanarima[];
}

interface Izabran {
  stan: StanSaStanarima;
  stanar: Stanar;
  dugme: HTMLElement;
}

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    MenuModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
  ],
  providers: [ConfirmationService],
  selector: 'app-stanari-zgrade',
  templateUrl: './stanari-zgrade.html',
  styleUrl: './stanari-zgrade.scss',
})
export class StanariZgrade {
  private stanariService = inject(StanariService);
  private confirmationService = inject(ConfirmationService);
  private readonly fokusiraj = fokusPosleCrtanja();
  readonly zgrada = input(undefined, { transform: numberAttribute });

  private readonly izbor = injectZgradeUpravnika();
  protected readonly admin = this.izbor.admin;
  protected readonly zgrade = this.izbor.zgrade;
  protected readonly ucitano = this.izbor.ucitano;
  protected readonly greska = this.izbor.greska;

  protected readonly zgradaId = linkedSignal<number | null>(() => {
    const zgrade = this.zgrade();
    return (zgrade.find((z) => z.id === this.zgrada()) ?? zgrade[0])?.id ?? null;
  });
  protected readonly stanovi = this.stanariService.stanovi(this.zgradaId);

  protected readonly upit = linkedSignal({ source: this.zgradaId, computation: () => '' });
  protected readonly pronadjeni = computed(() =>
    this.stanovi.hasValue() ? pretraziStanove(this.stanovi.value(), this.upit()) : [],
  );

  protected readonly spratovi = computed(() => {
    const spratovi = new Map<number, StanSaStanarima[]>();
    for (const stan of this.pronadjeni()) {
      const naSpratu = spratovi.get(stan.sprat) ?? [];
      naSpratu.push(stan);
      spratovi.set(stan.sprat, naSpratu);
    }
    return [...spratovi.entries()]
      .map(([sprat, stanovi]): Sprat => ({ sprat, stanovi }))
      .sort((a, b) => b.sprat - a.sprat);
  });

  protected readonly zbir = computed(() => {
    if (!this.stanovi.hasValue() || this.stanovi.value().length === 0) {
      return '';
    }
    const stanovi = this.stanovi.value();
    const naseljeni = stanovi.filter((s) => s.stanari.length > 0).length;
    const ljudi = stanovi.reduce((zbir, s) => zbir + s.stanari.length, 0);
    return `${naseljeni} od ${uMnozini(stanovi.length, 'stana', 'stana', 'stanova')} naseljeno · ${uMnozini(ljudi, 'stanar', 'stanara', 'stanara')}`;
  });

  protected readonly rezultat = computed(() =>
    this.upit().trim() === ''
      ? ''
      : `Pronađeno: ${uMnozini(this.pronadjeni().length, 'stan', 'stana', 'stanova')}`,
  );

  protected readonly izabran = signal<Izabran | null>(null);
  protected readonly meniOtvoren = signal(false);
  protected readonly uToku = signal(false);
  protected readonly poruka = signal<Poruka | null>(null);

  protected readonly radnje = computed((): MenuItem[] => {
    const izabran = this.izabran();
    if (izabran === null) {
      return [];
    }
    const vlasnik = izabran.stanar.vlasnik;
    return [
      {
        label: vlasnik ? 'Postavi za ukućanina' : 'Postavi za vlasnika',
        icon: vlasnik ? 'pi pi-user' : 'pi pi-key',
        disabled: this.uToku(),
        command: () => this.promeniVlasnika(izabran),
      },
      {
        label: 'Odseli',
        icon: 'pi pi-sign-out',
        disabled: this.uToku(),
        command: () => this.odseli(izabran),
      },
    ];
  });

  protected readonly telefon = formatirajTelefon;

  protected ime(stanar: Stanar): string {
    return `${stanar.korisnik.ime} ${stanar.korisnik.prezime}`;
  }

  protected nazivSprata(sprat: number): string {
    return sprat === 0 ? 'Prizemlje' : `${sprat}. sprat`;
  }

  protected promeniZgradu(id: number): void {
    this.zgradaId.set(id);
    this.poruka.set(null);
  }

  protected otvoriMeni(event: MouseEvent, meni: Menu, stan: StanSaStanarima, stanar: Stanar) {
    this.izabran.set({ stan, stanar, dugme: event.currentTarget as HTMLElement });
    meni.toggle(event);
  }

  private promeniVlasnika({ stan, stanar, dugme }: Izabran): void {
    const zgradaId = this.zgradaId();
    if (zgradaId === null) {
      return;
    }
    const ime = this.ime(stanar);
    const vlasnik = !stanar.vlasnik;
    const promeni = () =>
      this.izvrsi(
        this.stanariService.promeniVlasnika(zgradaId, stanar.id, vlasnik),
        `${ime} je sada ${vlasnik ? 'vlasnik' : 'ukućanin'} stana ${stan.broj}.`,
        { tip: 'greska', tekst: `${ime} više nije stanar stana ${stan.broj}.` },
      );
    if (vlasnik) {
      void promeni();
      return;
    }
    this.confirmationService.confirm({
      header: 'Promena u ukućanina',
      message: `${ime} više neće glasati u odlukama za stan ${stan.broj}. Glasovi ovog stanara za stan ${stan.broj} u odlukama koje traju biće obrisani.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Postavi za ukućanina' },
      accept: promeni,
      reject: () => dugme.focus(),
    });
  }

  private odseli({ stan, stanar, dugme }: Izabran): void {
    const zgradaId = this.zgradaId();
    if (zgradaId === null) {
      return;
    }
    const ime = this.ime(stanar);
    this.confirmationService.confirm({
      header: 'Odseljenje',
      message: `${ime} više neće biti stanar stana ${stan.broj}. Glasovi za ovaj stan u odlukama koje traju se brišu, a ako nema drugi stan u zgradi, i glasovi u anketama i praćenja kvarova. Nalog ostaje.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Odseli', severity: 'danger' },
      accept: () =>
        this.izvrsi(
          this.stanariService.odseli(zgradaId, stanar.id),
          `${ime} više nije stanar stana ${stan.broj}.`,
          { tip: 'uspeh', tekst: `${ime} već nije stanar stana ${stan.broj}.` },
        ),
      reject: () => dugme.focus(),
    });
  }

  private async izvrsi(zahtev: Observable<unknown>, uspeh: string, nema: Poruka): Promise<void> {
    this.uToku.set(true);
    try {
      await firstValueFrom(zahtev);
      this.prikazi({ tip: 'uspeh', tekst: uspeh });
    } catch (err) {
      this.prikazi(
        err instanceof HttpErrorResponse && err.status === 404
          ? nema
          : { tip: 'greska', tekst: 'Promena nije sačuvana. Pokušaj ponovo.' },
      );
    } finally {
      this.uToku.set(false);
      this.stanovi.reload();
    }
  }

  private prikazi(poruka: Poruka): void {
    this.poruka.set(poruka);
    this.fokusiraj('#poruka-stanara');
  }
}
