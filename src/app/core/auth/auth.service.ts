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
            .post<{ token: string }>(`${environment.apiUrl}/api/auth/login`, { email, password })
            .pipe(tap(res => localStorage.setItem(this.tokenKey, res.token)));
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
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