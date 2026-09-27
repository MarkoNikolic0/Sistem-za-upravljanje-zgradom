import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { KorisnikResponse, LoginResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(email: string, lozinka: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, lozinka })
      .pipe(tap((res) => localStorage.setItem('token', res.access_token)));
  }

  register(
    ime: string,
    prezime: string,
    email: string,
    lozinka: string,
  ): Observable<KorisnikResponse> {
    return this.http.post<KorisnikResponse>(`${this.apiUrl}/auth/register`, {
      ime,
      prezime,
      email,
      lozinka,
    });
  }

  logout() {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
