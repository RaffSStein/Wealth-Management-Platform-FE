import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface UserDTO {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  // Altri campi che il tuo BE potrebbe restituire
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  // Username scelto in fase di login (fittizia)
  readonly username = signal<string | null>(null);

  // Dati base dell'utente caricati da /user-service/me
  readonly user = signal<UserDTO | null>(null);

  // Comodità per sapere se abbiamo un utente caricato
  readonly isLoggedIn = computed(() => !!this.username());

  constructor(private readonly http: HttpClient) {}

  setUsername(name: string) {
    this.username.set(name);
  }

  loadMe(): Observable<UserDTO> {
    return this.http.get<UserDTO>('/user-service/me').pipe(
      tap((u) => this.user.set(u)),
      catchError((err) => {
        // In sviluppo, non bloccare il flusso: salva un placeholder e prosegui
        console.warn('[UserService] Impossibile caricare /me', err);
        const fallback: UserDTO = { username: this.username() ?? undefined };
        this.user.set(fallback);
        return of(fallback);
      })
    );
  }
}

