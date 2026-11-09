import { Component, computed, inject, input, output } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { EvidencijaPrisustva } from '../evidencija-prisustva/evidencija-prisustva';
import { TrakaKvoruma } from '../../glasanje/traka-kvoruma/traka-kvoruma';
import { stanova, udeo } from '../../glasanje/pravila-glasanja';
import { PregledPrisustva } from '../sastanak-models';
import { SastanakService } from '../sastanak-service';
import { imaKvorum } from '../pravila-sastanka';

@Component({
  imports: [ButtonModule, MessageModule, TrakaKvoruma, EvidencijaPrisustva],
  providers: [AkcijeStore],
  selector: 'app-prisustvo-sastanka',
  styleUrl: './prisustvo-sastanka.scss',
  templateUrl: './prisustvo-sastanka.html',
})
export class PrisustvoSastanka {
  private sastanakService = inject(SastanakService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly sastanakId = input.required<number>();
  readonly prisustvo = input.required<PregledPrisustva>();
  readonly promena = output<PregledPrisustva>();
  readonly osvezi = output();

  protected readonly stanova = stanova;
  protected readonly udeo = udeo;

  protected readonly kvorumUtvrdjen = computed(() => {
    const kvorum = this.prisustvo().kvorum;
    return kvorum !== null && imaKvorum(kvorum);
  });

  protected readonly brojStanova = computed(() => {
    const kvorum = this.prisustvo().kvorum;
    return kvorum === null ? 0 : (kvorum.prisutno ?? kvorum.najavljeno);
  });

  protected async najavi(dolazi: boolean): Promise<void> {
    if (this.akcije.akcijaUToku() || this.prisustvo().mojOdgovor === dolazi) {
      return;
    }
    const uspelo = await this.posalji(
      this.sastanakService.najavi(this.sastanakId(), dolazi),
      dolazi ? 'Zabeleženo je da dolaziš.' : 'Zabeleženo je da ne dolaziš.',
      'Odgovor nije sačuvan. Pokušaj ponovo.',
    );
    if (!uspelo) {
      this.fokusiraj('#poruka-prisustva');
    }
  }

  protected async povuci(): Promise<void> {
    const uspelo = await this.posalji(
      this.sastanakService.povuciNajavu(this.sastanakId()),
      'Odgovor je povučen.',
      'Odgovor nije povučen. Pokušaj ponovo.',
    );
    this.fokusiraj(uspelo ? '.odgovor' : '#poruka-prisustva');
  }

  private posalji(
    zahtev: Observable<PregledPrisustva>,
    uspeh: string,
    neuspeh: string,
  ): Promise<boolean> {
    return this.akcije.izvrsi(
      async () => this.promena.emit(await firstValueFrom(zahtev)),
      uspeh,
      neuspeh,
      () => this.osvezi.emit(),
    );
  }
}
