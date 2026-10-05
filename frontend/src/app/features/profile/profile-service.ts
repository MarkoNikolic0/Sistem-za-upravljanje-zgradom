import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileResponse, UpdateProfileRequest } from './profile-models';

@Service()
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/korisnik/moj-profil`;

  profile() {
    return httpResource<ProfileResponse>(() => this.apiUrl);
  }

  update(podaci: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(this.apiUrl, podaci);
  }
}
