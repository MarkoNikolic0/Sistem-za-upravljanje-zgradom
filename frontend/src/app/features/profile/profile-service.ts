import { computed, effect, inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileResponse, UpdateProfileRequest } from './profile-models';
import { AuthStore } from '../auth/sesija/auth-store';

const SVEZ_PROFIL_MS = 10_000;

@Service()
export class ProfileService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = `${environment.apiUrl}/korisnik/moj-profil`;
  private readonly korisnikId = computed(() => this.authStore.korisnik()?.id);
  private ucitan = 0;

  readonly profil = httpResource<ProfileResponse>(() =>
    this.korisnikId() ? this.apiUrl : undefined,
  );

  constructor() {
    effect(() => {
      if (this.profil.hasValue()) {
        this.profil.value();
        this.ucitan = Date.now();
      }
    });
  }

  osvezenProfil() {
    if (!this.profil.isLoading() && Date.now() - this.ucitan > SVEZ_PROFIL_MS) {
      this.profil.reload();
    }
    return this.profil;
  }

  update(podaci: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(this.apiUrl, podaci);
  }
}
