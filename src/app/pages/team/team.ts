import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type TeamUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  title?: string | null;
  avatarUrl?: string | null;
};

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Ekip" subtitle="Ekip üyeleri">
    @if (canManageTeam) {
      <button type="button" class="add-btn" (click)="addMember()">+ Çalışan Ekle</button>
    }
  </app-header>

  <div class="topbar">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input"
             [(ngModel)]="q"
             (ngModelChange)="applyFilter()"
             placeholder="İsim veya email ara…" />
    </div>
    <div class="count-chip">{{ filtered.length }} kişi</div>
  </div>

  @if (loading) { <div class="loading-row"><div class="spinner"></div> Yükleniyor…</div> }
  @if (error)   { <div class="err-box">{{ error }}</div> }

  @if (!loading && filtered.length === 0 && !error) {
    <div class="empty-state">
      <div class="empty-icon">👥</div>
      <div class="empty-title">Kayıt bulunamadı</div>
    </div>
  }

  @if (!loading && filtered.length) {
    <div class="grid">
      @for (u of filtered; track u.id; let i = $index) {
        <div class="card member-card" [style.animation-delay]="(i * 0.05) + 's'">
          <div class="member-row">
            <div class="avatar" [style.background]="avatarBg(u)">
              @if (u.avatarUrl) {
                <img [src]="u.avatarUrl" [alt]="u.name || u.email || 'Kullanıcı'" />
              } @else {
                <span>{{ initials(u) }}</span>
              }
            </div>

            <div class="meta">
              <div class="member-name">{{ u.name || u.email || 'Kullanıcı' }}</div>
              @if (u.email) { <div class="muted small">{{ u.email }}</div> }
              <div class="badges">
                <span class="role-badge" [class]="roleCls(u.role)">{{ roleLabel(u.role) }}</span>
                @if (u.title) { <span class="title-pill">{{ u.title }}</span> }
              </div>
            </div>

            @if (canDelete) {
              @if (confirmingDeleteId !== u.id) {
                <button type="button" class="del-btn"
                        [disabled]="deleting[u.id]"
                        (click)="confirmingDeleteId = u.id">
                  Sil
                </button>
              } @else {
                <button type="button" class="del-yes-btn" (click)="deleteUser(u)">Evet</button>
                <button type="button" class="del-cancel-btn" (click)="confirmingDeleteId = null">Vazgeç</button>
              }
            }
          </div>
        </div>
      }
    </div>
  }
</div>
`,
  styles: [`
@keyframes card-in {
  from { opacity: 0; transform: translateY(18px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Add button ── */
.add-btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform .13s, box-shadow .15s;
}
.add-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(120,90,255,.35); }
.add-btn:active { transform: translateY(0); box-shadow: none; }

/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 11px 14px 11px 38px;
  border-radius: 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  color: var(--text);
  outline: none;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  transition: background .15s, border-color .15s, box-shadow .15s;
}
.search-input:focus {
  background: rgba(255,255,255,.09);
  border-color: rgba(120,90,255,.45);
  box-shadow: 0 0 0 3px rgba(120,90,255,.12);
}

.count-chip {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Member grid ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}

/* ── Member card ── */
.member-card {
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
  animation: card-in .38s cubic-bezier(.22,.68,0,1.2) both;
  transition: transform .18s ease, box-shadow .18s ease;
}

.member-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(300px 160px at 0% 0%, rgba(120,90,255,.12), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.member-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 44px rgba(0,0,0,.28);
}

/* ── Member row ── */
.member-row {
  display: flex;
  gap: 14px;
  align-items: center;
  position: relative;
  z-index: 1;
}

/* ── Avatar ── */
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.12);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Meta ── */
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-name {
  font-weight: 900;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Badges ── */
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.role-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid transparent;
  letter-spacing: .02em;
}
.role-badge.r-admin  { background: rgba(255,80,80,.12);   border-color: rgba(255,80,80,.28);   color: #ff9999; }
.role-badge.r-lead   { background: rgba(120,90,255,.12);  border-color: rgba(120,90,255,.28);  color: #b0a0ff; }
.role-badge.r-junior { background: rgba(100,160,255,.12); border-color: rgba(100,160,255,.28); color: #80b4ff; }
.role-badge.r-other  { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); color: var(--text); }

.title-pill {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 11px;
  font-weight: 700;
  opacity: .8;
}

/* ── Delete button ── */
.del-btn {
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,92,122,.32);
  background: rgba(255,92,122,.08);
  color: #ff8099;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, box-shadow .15s, transform .12s;
}
.del-btn:hover    { background: rgba(255,92,122,.18); box-shadow: 0 4px 14px rgba(255,92,122,.18); transform: translateY(-1px); }
.del-btn:active   { transform: translateY(0); }
.del-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

.del-yes-btn {
  padding: 6px 14px; border-radius: 10px; border: none;
  background: rgba(255,80,80,.8); color: #fff;
  font-weight: 700; font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.del-yes-btn:hover { background: rgba(255,80,80,1); }

.del-cancel-btn {
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05); color: var(--text);
  font-weight: 700; font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.del-cancel-btn:hover { background: rgba(255,255,255,.10); }

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
}
.empty-icon  { font-size: 44px; opacity: .45; }
.empty-title { font-size: 17px; font-weight: 800; opacity: .7; }

/* ── Loading / error ── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
  opacity: .7;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.err-box {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255,80,80,.10);
  border: 1px solid rgba(255,80,80,.35);
  color: #ffd1d1;
  margin-bottom: 14px;
}
`]
})
export class TeamComponent implements OnInit {
  users: TeamUser[] = [];
  filtered: TeamUser[] = [];
  q = '';
  loading = false;
  error = '';
  canDelete = false;
  deleting: Record<number, boolean> = {};
  confirmingDeleteId: number | null = null;

  get canManageTeam(): boolean { return this.auth.hasAnyRole('Admin', 'Lead'); }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canDelete = this.getRoleFromToken() === 'Admin';
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.error = '';

    this.http.get<any[]>(`${environment.apiUrl}/api/users`).subscribe({
      next: (res) => {
        this.users = (res ?? []).map(x => ({
          id: x.id, name: x.name ?? null, email: x.email ?? null,
          role: x.role ?? null, title: x.title ?? null, avatarUrl: x.avatarUrl ?? null
        }));
        this.users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        if (err?.status === 403) { this.error = 'Bu sayfayı görüntüleme yetkin yok.'; this.cd.detectChanges(); return; }
        let detail = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.error?.title || '');
        this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  applyFilter(): void {
    const s = (this.q || '').trim().toLowerCase();
    this.filtered = s
      ? this.users.filter(u => (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s))
      : [...this.users];
    this.cd.detectChanges();
  }

  addMember(): void { this.router.navigateByUrl('/team/create'); }

  deleteUser(u: TeamUser): void {
    if (!this.canDelete) return;
    this.confirmingDeleteId = null;
    this.error = '';
    this.deleting[u.id] = true;

    this.http.delete(`${environment.apiUrl}/api/users/${u.id}`, { responseType: 'text' }).subscribe({
      next: () => {
        delete this.deleting[u.id];
        this.users = this.users.filter(x => x.id !== u.id);
        this.applyFilter();
        this.cd.detectChanges();
      },
      error: (err) => {
        delete this.deleting[u.id];
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        let detail = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.error?.title || '');
        this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  initials(u: TeamUser): string {
    const name = (u.name || '').trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      return ((parts[0]?.[0] || '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '')).toUpperCase() || 'U';
    }
    const email = (u.email || '').trim();
    return email ? email.slice(0, 2).toUpperCase() : 'U';
  }

  avatarBg(u: TeamUser): string {
    const seed = ((u.name || u.email || 'U').charCodeAt(0) * 137 + (u.id * 31)) % 360;
    return `hsl(${seed}, 50%, 32%)`;
  }

  roleCls(role: string | null | undefined): string {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'r-admin';
    if (r === 'lead') return 'r-lead';
    if (r === 'junior') return 'r-junior';
    return 'r-other';
  }

  roleLabel(role: string | null | undefined): string {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'lead') return 'Lead';
    if (r === 'junior') return 'Junior';
    return role || 'Üye';
  }

  private getRoleFromToken(): string {
    const token = localStorage.getItem('tm_token') || '';
    const payload = this.parseJwt(token);
    return payload?.role || payload?.Role ||
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
  }

  private parseJwt(token: string): any {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
  }
}
