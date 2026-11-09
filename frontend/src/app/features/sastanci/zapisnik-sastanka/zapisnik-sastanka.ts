import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { Poruka } from '../../../shared/stanje/poruka';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { FormaDokumenta } from '../../dokumenti/forma-dokumenta/forma-dokumenta';
import { RedDokumenta } from '../../dokumenti/red-dokumenta/red-dokumenta';
import { Sastanak } from '../sastanak-models';
import { SastanakService } from '../sastanak-service';

@Component({
  selector: 'app-zapisnik-sastanka',
  imports: [ButtonModule, ConfirmDialogModule, MessageModule, FormaDokumenta, RedDokumenta],
  providers: [ConfirmationService, AkcijeStore],
  templateUrl: './zapisnik-sastanka.html',
  styleUrl: './zapisnik-sastanka.scss',
})
export class ZapisnikSastanka {
  private sastanakService = inject(SastanakService);
  private confirmationService = inject(ConfirmationService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly sastanak = input.required<Sastanak>();

  readonly promena = output<Sastanak>();
  readonly osvezi = output<void>();
  readonly zastarelo = output<string>();

  protected readonly forma = linkedSignal({
    source: () => this.sastanak().zapisnik?.id,
    computation: () => false,
  });

  protected otvori(): void {
    this.forma.set(true);
    this.akcije.ponisti();
  }

  protected zatvori(): void {
    this.forma.set(false);
    this.fokusiraj(this.sastanak().zapisnik ? '#zameni-zapisnik' : '#okaci-zapisnik');
  }

  protected okacen(sastanak: Sastanak): void {
    const zamena = Boolean(this.sastanak().zapisnik);
    this.forma.set(false);
    this.promena.emit(sastanak);
    this.prikazi({
      tip: 'uspeh',
      tekst: zamena
        ? 'Zapisnik je zamenjen.'
        : 'Zapisnik je okačen. Nalazi se i u Dokumentima zgrade.',
    });
  }

  protected odbijeno(tekst: string): void {
    this.forma.set(false);
    this.zastarelo.emit(tekst);
  }

  protected ukloni(event: Event): void {
    const dugme = event.currentTarget as HTMLElement;
    const { id, vrsta } = this.sastanak();
    this.confirmationService.confirm({
      header: 'Uklanjanje zapisnika',
      message:
        'Ukloniti zapisnik? Fajl se briše i iz Dokumenata zgrade.' +
        (vrsta === 'skupstina' ? ' Evidencija prisustva ponovo može da se menja.' : ''),
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Ukloni', severity: 'danger' },
      accept: async () => {
        await this.akcije.izvrsi(
          async () => {
            this.promena.emit(await firstValueFrom(this.sastanakService.ukloniZapisnik(id)));
          },
          'Zapisnik je uklonjen.',
          'Zapisnik nije uklonjen. Pokušaj ponovo.',
          () => this.osvezi.emit(),
          { tip: 'uspeh', tekst: 'Zapisnik je već uklonjen.' },
        );
        this.fokusiraj('#poruka-zapisnika');
      },
      reject: () => dugme.focus(),
    });
  }

  private prikazi(poruka: Poruka): void {
    this.akcije.prikaziPoruku(poruka);
    this.fokusiraj('#poruka-zapisnika');
  }
}
