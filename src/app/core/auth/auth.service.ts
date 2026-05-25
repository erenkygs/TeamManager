import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly tokenKey = 'tm_token';
    constructor(private http: HttpClient) { }
    login(email: string, password: string) {
        return this.http
            .post<{ token: string; sessionId: number }>(`${environment.apiUrl}/api/auth/login`, { email, password })
            .pipe(tap(res => {
                localStorage.setItem(this.tokenKey, res.token);
                localStorage.setItem('tm_session_id', String(res.sessionId));
                sessionStorage.setItem('tm_session_start', String(Date.now()));
                sessionStorage.removeItem('tm_session_saved');
            }));
    }

    logout() {
        const elapsed = this.getSessionElapsed();
        sessionStorage.setItem('tm_session_saved', String(elapsed));
        const sessionId = Number(localStorage.getItem('tm_session_id') ?? '0');
        if (sessionId) {
            this.http.post(`${environment.apiUrl}/api/auth/logout`, { sessionId }).subscribe({ error: () => {} });
        }
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('tm_session_id');
        sessionStorage.removeItem('tm_session_start');
        sessionStorage.removeItem('tm_session_saved');
    }

    getSessionElapsed(): number {
        const saved = Number(sessionStorage.getItem('tm_session_saved') ?? '0');
        const start = Number(sessionStorage.getItem('tm_session_start') ?? '0');
        const current = start ? Math.floor((Date.now() - start) / 1000) : 0;
        return saved + current;
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    getRole(): string | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role
                ?? payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
                ?? null;
        } catch {
            return null;
        }
    }

    hasAnyRole(...roles: string[]): boolean {
        const role = this.getRole();
        return !!role && roles.includes(role);
    }

    isAdmin(): boolean {
        return this.getRole() === 'Admin';
    }

    isLead(): boolean {
        return this.getRole() === 'Lead';
    }

    getUserId(): number | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const raw =
                payload.userId ??
                payload.UserId ??
                payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
                payload.sub ??
                null;

            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }
}