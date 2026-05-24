import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Profilim" subtitle="Hesap bilgileri ve şifre işlemleri"></app-header>

  @if (error) { <div class="msg-box err">{{ error }}</div> }
  @if (ok)    { <div class="msg-box ok">✓ {{ ok }}</div> }

  @if (loading) { <div class="loading-row"><div class="spinner"></div> Yükleniyor…</div> }

  @if (!loading && me) {
    <div class="layout">

      <!-- Sol: Kullanıcı bilgileri -->
      <div class="card info-card">
        <!-- Avatar -->
        <div class="avatar-wrap">
          <div class="avatar">{{ initials() }}</div>
          <div class="avatar-glow"></div>
        </div>

        <div class="display-name">{{ me.name || me.email || 'Kullanıcı' }}</div>
        <div class="role-badge" [class]="roleCls()">{{ roleLabel() }}</div>

        <div class="info-rows">
          <div class="info-row">
            <span class="info-label">Ad Soyad</span>
            <span class="info-val">{{ me.name || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-val">{{ me.email || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Rol</span>
            <span class="info-val">{{ roleLabel() }}</span>
          </div>
          @if (me.title) {
            <div class="info-row">
              <span class="info-label">Ünvan</span>
              <span class="info-val">{{ me.title }}</span>
            </div>
          }
          @if (me.createdAt) {
            <div class="info-row">
              <span class="info-label">Kayıt</span>
              <span class="info-val">{{ fmt(me.createdAt) }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Sağ: Şifre değiştir -->
      <div class="card pw-card">
        <div class="card-title">Şifre Değiştir</div>

        <div class="fields">
          <div class="field">
            <label>Mevcut Şifre</label>
            <div class="pw-row">
              <input class="input" [type]="show0 ? 'text' : 'password'"
                     [(ngModel)]="currentPassword" placeholder="Mevcut şifre" />
              <button type="button" class="eye-btn" (click)="show0 = !show0">
                {{ show0 ? 'Gizle' : 'Göster' }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>Yeni Şifre</label>
            <div class="pw-row">
              <input class="input" [type]="show1 ? 'text' : 'password'"
                     [(ngModel)]="newPassword" placeholder="En az 6 karakter" />
              <button type="button" class="eye-btn" (click)="show1 = !show1">
                {{ show1 ? 'Gizle' : 'Göster' }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>Yeni Şifre (tekrar)</label>
            <div class="pw-row">
              <input class="input" [type]="show2 ? 'text' : 'password'"
                     [(ngModel)]="newPassword2" placeholder="Şifreyi tekrar gir" />
              <button type="button" class="eye-btn" (click)="show2 = !show2">
                {{ show2 ? 'Gizle' : 'Göster' }}
              </button>
            </div>
          </div>
        </div>

        <div class="pw-actions">
          <button class="action-btn cancel-btn" type="button" (click)="clearPw()">Temizle</button>
          <button class="action-btn save-btn" type="button"
                  [disabled]="saving || !canSave()" (click)="changePassword()">
            @if (!saving) { <span>Kaydet</span> }
            @if (saving)  { <span>Kaydediliyor…</span> }
          </button>
        </div>
      </div>
    </div>
  }
</div>
`,
  styles: [`
@keyframes card-in {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Layout ── */
.layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 14px;
  align-items: start;
}

@media (max-width: 780px) { .layout { grid-template-columns: 1fr; } }

/* ── Info card ── */
.info-card {
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2);
}

.info-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(400px 300px at 50% 0%, rgba(120,90,255,.18), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* ── Avatar ── */
.avatar-wrap {
  position: relative;
  z-index: 1;
  margin-bottom: 4px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  border: 3px solid rgba(255,255,255,.14);
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  filter: blur(14px);
  opacity: .35;
  z-index: -1;
}

.display-name {
  font-size: 18px;
  font-weight: 900;
  position: relative;
  z-index: 1;
  text-align: center;
}

/* ── Role badge ── */
.role-badge {
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid transparent;
  position: relative;
  z-index: 1;
  margin-bottom: 6px;
}
.r-admin  { background: rgba(255,80,80,.12);   border-color: rgba(255,80,80,.28);   color: #ff9999; }
.r-lead   { background: rgba(120,90,255,.12);  border-color: rgba(120,90,255,.28);  color: #b0a0ff; }
.r-junior { background: rgba(100,160,255,.12); border-color: rgba(100,160,255,.28); color: #80b4ff; }
.r-other  { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); color: var(--text); }

/* ── Info rows ── */
.info-rows {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  z-index: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 12px;
  font-weight: 700;
  opacity: .5;
  white-space: nowrap;
}

.info-val {
  font-size: 14px;
  font-weight: 800;
  text-align: right;
  word-break: break-all;
}

/* ── Password card ── */
.pw-card {
  padding: 28px 24px;
  position: relative;
  overflow: hidden;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) .07s both;
}

.pw-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(500px 250px at 0% 0%, rgba(0,200,130,.12), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 900;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

/* ── Fields ── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.field {
  display: grid;
  gap: 7px;
}

label {
  font-size: 13px;
  font-weight: 700;
  opacity: .8;
}

.pw-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  color: var(--text);
  outline: none;
  box-sizing: border-box;
  font-size: 14px;
  font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.input:focus {
  background: rgba(255,255,255,.09);
  border-color: rgba(0,200,130,.45);
  box-shadow: 0 0 0 3px rgba(0,200,130,.10);
}

.eye-btn {
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  transition: background .12s;
}
.eye-btn:hover { background: rgba(255,255,255,.11); }

/* ── Actions ── */
.pw-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  position: relative;
  z-index: 1;
}

.action-btn {
  padding: 11px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: transform .13s ease, box-shadow .15s ease, background .15s ease;
}
.action-btn:hover    { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.28); }
.action-btn:active   { transform: translateY(0); box-shadow: none; }
.action-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

.cancel-btn {
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: var(--text);
}
.cancel-btn:hover { background: rgba(255,255,255,.12); }

.save-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  min-width: 120px;
}

/* ── Messages ── */
.msg-box {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 14px;
}
.msg-box.err {
  background: rgba(255,80,80,.10);
  border: 1px solid rgba(255,80,80,.35);
  color: #ffd1d1;
}
.msg-box.ok {
  background: rgba(0,210,140,.10);
  border: 1px solid rgba(0,210,140,.35);
  color: #a8ffd6;
  animation: pop-in .28s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Loading ── */
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
`]
})
export class ProfileComponent implements OnInit {
  me: any = null;
  loading = false;
  saving = false;
  error = '';
  ok = '';

  currentPassword = '';
  newPassword = '';
  newPassword2 = '';
  show0 = false;
  show1 = false;
  show2 = false;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadMe(); }

  loadMe(): void {
    this.loading = true;
    this.error = '';
    this.ok = '';

    this.http.get<any>(`${environment.apiUrl}/api/users/me`).subscribe({
      next: (res) => { this.me = res; this.loading = false; this.cd.detectChanges(); },
      error: (err) => { this.loading = false; this.handleErr(err); }
    });
  }

  canSave(): boolean {
    return !!this.currentPassword && !!this.newPassword && !!this.newPassword2;
  }

  changePassword(): void {
    this.error = '';
    this.ok = '';

    if (!this.currentPassword || !this.newPassword || !this.newPassword2) {
      this.error = 'Tüm şifre alanları zorunlu.';
      this.cd.detectChanges();
      return;
    }
    if (this.newPassword !== this.newPassword2) {
      this.error = 'Yeni şifreler eşleşmiyor.';
      this.cd.detectChanges();
      return;
    }
    if (this.newPassword.length < 6) {
      this.error = 'Yeni şifre en az 6 karakter olmalı.';
      this.cd.detectChanges();
      return;
    }

    this.saving = true;

    this.http.post(`${environment.apiUrl}/api/users/change-password`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.saving = false;
        this.ok = 'Şifre başarıyla güncellendi';
        this.clearPw();
        this.cd.detectChanges();
      },
      error: (err) => { this.saving = false; this.handleErr(err); }
    });
  }

  clearPw(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.newPassword2 = '';
    this.cd.detectChanges();
  }

  initials(): string {
    const name = (this.me?.name || '').trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      return ((parts[0]?.[0] || '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '')).toUpperCase() || 'U';
    }
    const email = (this.me?.email || '').trim();
    return email ? email.slice(0, 2).toUpperCase() : 'U';
  }

  roleCls(): string {
    const r = (this.me?.role || '').toLowerCase();
    if (r === 'admin') return 'r-admin';
    if (r === 'lead')  return 'r-lead';
    if (r === 'junior') return 'r-junior';
    return 'r-other';
  }

  roleLabel(): string {
    const r = (this.me?.role || '').toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'lead')  return 'Lead';
    if (r === 'junior') return 'Junior';
    return this.me?.role || 'Üye';
  }

  fmt(str: string): string {
    if (!str) return '';
    try {
      const d = new Date(str);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return str; }
  }

  private handleErr(err: any): void {
    if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
    let detail = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.error?.title || '');
    this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
    console.error(err);
    this.cd.detectChanges();
  }
}
