import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Ekip" subtitle="Ekip üyeleri">
  <button *ngIf="canManageTeam" class="btn primary" (click)="addMember()">+ Çalışan Ekle</button>
  </app-header>

  <div class="topbar">
    <input class="input"
           [(ngModel)]="q"
           (ngModelChange)="applyFilter()"
           placeholder="İsim veya email ara..." />

    <div class="muted small">{{ filtered.length }} kişi</div>
  </div>

  <div *ngIf="loading" class="muted" style="margin-top:14px;">Yükleniyor…</div>
  <div *ngIf="error" class="api-error">{{ error }}</div>

  <div *ngIf="!loading && filtered.length===0" class="muted" style="margin-top:16px;">
    Kayıt bulunamadı.
  </div>

  <div *ngIf="!loading && filtered.length"
       class="grid">
    <div class="card member" *ngFor="let u of filtered">
      <div class="row1">
        <div class="left">
          <div class="avatar">
            <img *ngIf="u.avatarUrl; else letter" [src]="u.avatarUrl" [alt]="u.name || u.email || 'Kullanıcı'">
            <ng-template #letter>
              <span>{{ initials(u) }}</span>
            </ng-template>
          </div>

          <div class="meta">
            <div class="name">{{ u.name || (u.email || 'Kullanıcı') }}</div>
            <div class="muted small" *ngIf="u.email">{{ u.email }}</div>
          </div>
        </div>

        <div class="right">
        <div class="pill" *ngIf="u.title">{{ u.title }}</div>
          <button *ngIf="canDelete"
                  class="btn danger"
                  type="button"
                  [disabled]="deleting[u.id]"
                  (click)="deleteUser(u)">
            {{ deleting[u.id] ? 'Siliniyor…' : 'Sil' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
.topbar{
  display:flex;
  gap:12px;
  align-items:center;
  flex-wrap:wrap;
  margin-top:14px;
}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(380px,1fr));
  gap:14px;
  margin-top:14px;
}
.member{
  padding:16px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.row1{
  display:flex;
  gap:12px;
  align-items:center;
  justify-content:space-between;
}
.left{
  display:flex;
  gap:12px;
  align-items:center;
  min-width:0;
}
.meta{
  min-width:0;
}
.avatar{
  width:44px;
  height:44px;
  border-radius:999px;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  flex: 0 0 auto;
}
.avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.name{
  font-weight:900;
  font-size:16px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.right{
  flex:0 0 auto;     
  margin-left:auto;   
  display:flex;
  align-items:center;
  gap:10px;
}
.pill{
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.10);
  font-size:12px;
  font-weight:800;
}
.chip{
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  font-size:12px;
  font-weight:800;
  width:max-content;
}
.row2{
  display:flex;
  gap:10px;
  align-items:center;
  margin-top:2px;
}
.input{
  width:min(520px, 100%);
  padding:10px 12px;
  border-radius:12px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  color:var(--text);
  outline:none;
}
.input:focus{
  background:rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.22);
}
.api-error{ margin-top:10px; color:#ff7b90; }
.btn.danger{
  border-color: rgba(255,92,122,.45);
  background: rgba(255,92,122,.12);
}
.btn.danger:hover{
  background: rgba(255,92,122,.18);
}
.btn.danger:disabled{
  opacity:.55;
  cursor:not-allowed;
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

  get canManageTeam(): boolean {
    return this.auth.hasAnyRole('Admin', 'Lead');
  }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const role = this.getRoleFromToken();
    this.canDelete = role === 'Admin';
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.error = '';

    this.http.get<any[]>(`${environment.apiUrl}/api/users`).subscribe({
      next: (res) => {
        this.users = (res ?? []).map(x => ({
          id: x.id,
          name: x.name ?? null,
          email: x.email ?? null,
          role: x.role ?? null,
          title: x.title ?? null,
          avatarUrl: x.avatarUrl ?? null
        }));

        this.users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        this.applyFilter();

        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;

        if (err?.status === 401) {
          this.auth.logout();
          this.router.navigateByUrl('/login');
          return;
        }

        if (err?.status === 403) {
          this.error = 'Bu sayfayı görüntüleme yetkin yok.';
          this.cd.detectChanges();
          return;
        }

        let detail = '';
        if (typeof err?.error === 'string') detail = err.error;
        else detail = err?.error?.message || err?.error?.title || '';

        this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  applyFilter(): void {
    const s = (this.q || '').trim().toLowerCase();

    if (!s) {
      this.filtered = [...this.users];
      this.cd.detectChanges();
      return;
    }

    this.filtered = this.users.filter(u => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(s) || email.includes(s);
    });

    this.cd.detectChanges();
  }

  addMember(): void {
    this.router.navigateByUrl('/team/create');
  }

  deleteUser(u: TeamUser): void {
    if (!this.canDelete) return;

    const label = u.name || u.email || 'Kullanıcı';
    const ok = confirm(`${label} silinsin mi?`);
    if (!ok) return;

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

        if (err?.status === 401) {
          this.auth.logout();
          this.router.navigateByUrl('/login');
          return;
        }

        let detail = '';
        if (typeof err?.error === 'string') detail = err.error;
        else detail = err?.error?.message || err?.error?.title || '';

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
      const a = parts[0]?.[0] || '';
      const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
      return (a + b).toUpperCase() || 'U';
    }
    const email = (u.email || '').trim();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  }

  roleLabel(role: string | null | undefined): string {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'lead') return 'Lead';
    if (r === 'member' || r === 'user' || r === 'üye') return 'Üye';
    if (r === 'junior') return 'Junior';
    return role || 'Üye';
  }

  private getRoleFromToken(): string {
    const token = localStorage.getItem('tm_token') || '';
    const payload = this.parseJwt(token);
    return (
      payload?.role ||
      payload?.Role ||
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      ''
    );
  }

  private parseJwt(token: string): any {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}