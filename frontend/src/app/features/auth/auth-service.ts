import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KorisnikResponse, LoginResponse } from './auth-models';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(email: string, lozinka: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, lozinka },
      { withCredentials: true },
    );
  }

  register(
    ime: string,
    prezime: string,
    email: string,
    lozinka: string,
  ): Observable<KorisnikResponse> {
    return this.http.post<KorisnikResponse>(`${this.apiUrl}/register`, {
      ime,
      prezime,
      email,
      lozinka,
    });
  }

  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, null, {
      withCredentials: true,
    });
  }

  logout(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/logout`, null, {
      withCredentials: true,
    });
  }
}
