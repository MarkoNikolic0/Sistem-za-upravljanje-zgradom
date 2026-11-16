import {
  Component,
  computed,
  DOCUMENT,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { Logo } from '../../../shared/logo/logo';
import { injectZgradeUpravnika } from '../zgrade-korisnika';
import { qrKod } from './qr-kod';

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    Logo,
  ],
  selector: 'app-plakat-zgrade',
  styleUrl: './plakat-zgrade.scss',
  templateUrl: './plakat-zgrade.html',
})
export class PlakatZgrade {
  private readonly dokument = inject(DOCUMENT);
  readonly zgrada = input(undefined, { transform: numberAttribute });

  private readonly izbor = injectZgradeUpravnika();
  protected readonly admin = this.izbor.admin;
  protected readonly zgrade = this.izbor.zgrade;
  protected readonly ucitano = this.izbor.ucitano;
  protected readonly greska = this.izbor.greska;

  protected readonly izabranoId = linkedSignal(() => {
    const zgrade = this.zgrade();
    return (zgrade.find((z) => z.id === this.zgrada()) ?? zgrade[0])?.id;
  });
  protected readonly izabrana = computed(() =>
    this.zgrade().find((z) => z.id === this.izabranoId()),
  );

  protected readonly link = computed(() => {
    const zgrada = this.izabrana();
    return zgrada && new URL(`poziv/${zgrada.id}`, this.dokument.baseURI);
  });
  protected readonly qr = computed(() => {
    const link = this.link();
    return link && qrKod(link.href);
  });

  protected readonly nazad = computed(() => {
    const zgrada = this.izabrana();
    return this.admin() && zgrada ? ['/zgrade', zgrada.id] : ['/zahtevi'];
  });

  protected stampaj(): void {
    this.dokument.defaultView?.print();
  }
}
