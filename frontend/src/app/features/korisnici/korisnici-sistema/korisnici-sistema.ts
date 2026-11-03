import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { NAZIVI_ULOGA, Uloga } from '../../auth/auth-models';
import { KategorijaKvara, NAZIVI_KATEGORIJA_KVARA } from '../../kvarovi/kvar-models';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { formatirajTelefon } from '../../../shared/telefon';
import { Paginacija } from '../../../shared/paginacija/paginacija';
import { DodeljivaUloga, KorisnikSistema, StanjeNaloga } from '../korisnik-models';
import { KorisnikService } from '../korisnik-service';
import { ListaKorisnikaStore } from '../lista-korisnika-store';

interface Izabran {
  korisnik: KorisnikSistema;
  dugme: HTMLElement;
}

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MenuModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    Paginacija,
  ],
  providers: [ListaKorisnikaStore, ConfirmationService],
  selector: 'app-korisnici-sistema',
  templateUrl: './korisnici-sistema.html',
  styleUrl: './korisnici-sistema.scss',
})
export class KorisniciSistema {
  protected readonly store = inject(ListaKorisnikaStore);
  private korisnikService = inject(KorisnikService);
  private confirmationService = inject(ConfirmationService);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly uloge = (Object.keys(NAZIVI_ULOGA) as Uloga[]).map((value) => ({
    value,
    naziv: NAZIVI_ULOGA[value],
  }));
  protected readonly stanja: { value: StanjeNaloga; naziv: string }[] = [
    { value: 'aktivni', naziv: 'Aktivni' },
    { value: 'deaktivirani', naziv: 'Deaktivirani' },
  ];
  protected readonly dodeljiveUloge: { value: DodeljivaUloga; naziv: string; opis: string }[] = [
    {
      value: 'stanar',
      naziv: NAZIVI_ULOGA.stanar,
      opis: 'Stanuje u zgradi, prijavljuje kvarove i glasa.',
    },
    {
      value: 'serviser',
      naziv: NAZIVI_ULOGA.serviser,
      opis: 'Radi na dodeljenim kvarovima. Ne može da ima stan.',
    },
  ];
  protected readonly struke = (Object.keys(NAZIVI_KATEGORIJA_KVARA) as KategorijaKvara[]).map(
    (value) => ({ value, naziv: NAZIVI_KATEGORIJA_KVARA[value] }),
  );
  protected readonly nazivUloge = NAZIVI_ULOGA;
  protected readonly telefon = formatirajTelefon;

  protected readonly upit = signal('');
  protected readonly izabran = signal<Izabran | null>(null);
  protected readonly meniOtvoren = signal(false);
  protected readonly imeIzabranog = computed(() => {
    const izabran = this.izabran();
    return izabran ? this.ime(izabran.korisnik) : '';
  });

  protected readonly dijalogUloge = signal(false);
  protected readonly novaUloga = signal<DodeljivaUloga>('stanar');
  protected readonly dijalogStruka = signal(false);
  protected readonly noveStruke = signal<KategorijaKvara[]>([]);

  protected readonly radnje = computed((): MenuItem[] => {
    const izabran = this.izabran();
    if (izabran === null) {
      return [];
    }
    const k = izabran.korisnik;
    const disabled = this.store.akcijaUToku();
    if (k.deaktiviran) {
      return [
        {
          label: 'Aktiviraj',
          icon: 'pi pi-replay',
          disabled,
          command: () => this.aktiviraj(izabran),
        },
      ];
    }
    return [
      {
        label: 'Promeni ulogu',
        icon: 'pi pi-id-card',
        disabled,
        command: () => this.otvoriUlogu(k),
      },
      ...(k.uloga === 'serviser'
        ? [
            {
              label: 'Struke',
              icon: 'pi pi-wrench',
              disabled,
              command: () => this.otvoriStruke(k),
            },
          ]
        : []),
      {
        label: 'Deaktiviraj',
        icon: 'pi pi-ban',
        disabled,
        command: () => this.deaktiviraj(izabran),
      },
    ];
  });

  protected ime(k: KorisnikSistema): string {
    return `${k.ime} ${k.prezime}`;
  }

  protected opisStanova(k: KorisnikSistema): string {
    return k.stanovi
      .map((s) => `${s.zgrada.naziv}, stan ${s.broj}${s.vlasnik ? ' (vlasnik)' : ''}`)
      .join(' · ');
  }

  protected opisStruka(k: KorisnikSistema): string {
    return k.specijalnosti.length
      ? k.specijalnosti.map((s) => NAZIVI_KATEGORIJA_KVARA[s]).join(', ')
      : 'Bez struka — ne može da dobije kvar';
  }

  protected pretrazi(tekst: string): void {
    this.upit.set(tekst);
    this.store.pretrazi(tekst);
  }

  protected otvoriMeni(event: MouseEvent, meni: Menu, korisnik: KorisnikSistema): void {
    this.izabran.set({ korisnik, dugme: event.currentTarget as HTMLElement });
    meni.toggle(event);
  }

  // Dijalog se zatvara posle animacije; posle čuvanja fokus ide na poruku, ne na dugme
  private sacuvano = false;

  protected vratiFokus(): void {
    if (this.sacuvano) {
      this.sacuvano = false;
      return;
    }
    this.izabran()?.dugme.focus();
  }

  private otvoriUlogu(k: KorisnikSistema): void {
    this.novaUloga.set(k.uloga === 'serviser' ? 'serviser' : 'stanar');
    this.dijalogUloge.set(true);
  }

  protected sacuvajUlogu(): void {
    const izabran = this.izabran();
    if (izabran === null) {
      return;
    }
    const k = izabran.korisnik;
    const uloga = this.novaUloga();
    if (uloga === k.uloga) {
      this.dijalogUloge.set(false);
      return;
    }
    this.sacuvano = true;
    this.dijalogUloge.set(false);
    void this.izvrsi(
      this.korisnikService.promeniUlogu(k.id, uloga),
      `Uloga je promenjena: ${this.ime(k)} je sada ${NAZIVI_ULOGA[uloga].toLowerCase()}.`,
    );
  }

  private otvoriStruke(k: KorisnikSistema): void {
    this.noveStruke.set([...k.specijalnosti]);
    this.dijalogStruka.set(true);
  }

  protected promeniStruku(struka: KategorijaKvara, izabrana: boolean): void {
    this.noveStruke.update((s) => (izabrana ? [...s, struka] : s.filter((x) => x !== struka)));
  }

  protected sacuvajStruke(): void {
    const izabran = this.izabran();
    if (izabran === null) {
      return;
    }
    this.sacuvano = true;
    this.dijalogStruka.set(false);
    void this.izvrsi(
      this.korisnikService.postaviSpecijalnosti(izabran.korisnik.id, this.noveStruke()),
      `Struke su sačuvane: ${this.ime(izabran.korisnik)}.`,
    );
  }

  private deaktiviraj({ korisnik: k, dugme }: Izabran): void {
    const posledice = [
      'Odseliće se iz svih stanova, a glasovi u glasanjima koja traju i praćenja kvarova se brišu.',
      ...(k.zgrada ? [`Prestaje da upravlja zgradom „${k.zgrada.naziv}“.`] : []),
      ...(k.uloga === 'serviser' ? ['Kvarovi na kojima radi vraćaju se upravniku.'] : []),
    ];
    this.confirmationService.confirm({
      header: 'Deaktivacija naloga',
      message: `${this.ime(k)} više neće moći da se prijavi. ${posledice.join(' ')} Nalog može ponovo da se aktivira, ali bez stanova.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Deaktiviraj', severity: 'danger' },
      accept: () =>
        this.izvrsi(
          this.korisnikService.deaktiviraj(k.id),
          `Nalog je deaktiviran: ${this.ime(k)}.`,
        ),
      reject: () => dugme.focus(),
    });
  }

  private aktiviraj({ korisnik: k }: Izabran): void {
    void this.izvrsi(
      this.korisnikService.aktiviraj(k.id),
      `Nalog je ponovo aktivan: ${this.ime(k)}.`,
    );
  }

  private async izvrsi(zahtev: Observable<unknown>, uspeh: string): Promise<void> {
    await this.store.izvrsi(
      async () => {
        await firstValueFrom(zahtev);
        this.store.ucitaj();
      },
      uspeh,
      'Promena nije sačuvana. Pokušaj ponovo.',
      () => this.store.ucitaj(),
      { tip: 'greska', tekst: 'Korisnik više ne postoji.' },
    );
    this.fokusiraj('#poruka-korisnika');
  }
}
