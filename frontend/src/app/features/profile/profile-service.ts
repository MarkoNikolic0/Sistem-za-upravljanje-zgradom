import { computed, effect, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, httpResource } from '@angular/common/http';
import { NavigationStart, Router } from '@angular/router';
import { filter, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileResponse, UpdateProfileRequest } from './profile-models';
import { AuthStore } from '../auth/sesija/auth-store';

@Service()
export class ProfileService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = `${environment.apiUrl}/korisnik/moj-profil`;
  private readonly korisnikId = computed(() => this.authStore.korisnik()?.id);
  private navigacija = 0;
  private ucitanPriNavigaciji = -1;

  readonly profil = httpResource<ProfileResponse>(() =>
    this.korisnikId() ? this.apiUrl : undefined,
  );

  constructor() {
    inject(Router)
      .events.pipe(
        filter((dogadjaj) => dogadjaj instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(({ id }) => (this.navigacija = id));
    effect(() => {
      if (this.profil.hasValue()) {
        this.profil.value();
        this.ucitanPriNavigaciji = this.navigacija;
      }
    });
  }

  osvezenProfil() {
    if (!this.profil.isLoading() && this.ucitanPriNavigaciji !== this.navigacija) {
      this.profil.reload();
    }
    return this.profil;
  }

  update(podaci: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(this.apiUrl, podaci);
  }

  obrisiNalog(lozinka: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/brisanje`, { lozinka });
  }
}
