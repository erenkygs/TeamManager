import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

type LoginResponse = { token: string; sessionId?: number };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="auth-shell">
  <div class="auth-card card" [class.mode-change]="mode === 'change'">

    <!-- TABS -->
    <div class="mode-tabs">
      <button class="tab-btn" [class.active]="mode === 'login'"  (click)="switchMode('login')"  type="button">Giriş Yap</button>
      <button class="tab-btn" [class.active]="mode === 'change'" (click)="switchMode('change')" type="button">Şifre Değiştir</button>
      <div class="tab-indicator" [class.right]="mode === 'change'"></div>
    </div>

    <!-- ANİMASYONLU FORM ALANI -->
    <div class="form-body" [class.exiting]="exiting">

      <!-- ── GİRİŞ FORMU ── -->
      @if (mode === 'login') {
      <form (ngSubmit)="submit()" autocomplete="on" novalidate>
        <div class="auth-header">
          <div class="brand">
            <div class="brand-mark">TM</div>
            <div>
              <div class="title">TeamManager</div>
              <div class="muted small" style="margin-top:2px;">Hesabına giriş yap</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Email</label>
          <input class="input" type="email" name="email" [(ngModel)]="email"
                 placeholder="ornek@gmail.com" autocomplete="email" required />
        </div>

        <div class="field">
          <label>Şifre</label>
          <div class="password-row">
            <input class="input" [type]="showPassword ? 'text' : 'password'" name="password"
                   [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" required />
            <button type="button" class="chip-btn" (click)="showPassword = !showPassword">
              {{ showPassword ? 'Gizle' : 'Göster' }}
            </button>
          </div>
        </div>

        @if (error) {
          <div class="msg-box err">{{ error }}</div>
        }

        <button class="btn-primary" type="submit" [disabled]="loading">
          @if (!loading) { <span>Giriş</span> }
          @if (loading)  { <span>Giriş yapılıyor…</span> }
        </button>

        <div class="muted small footer">Devam ederek kullanım koşullarını kabul etmiş olursun.</div>
        <div class="login-version" (click)="changelogOpen = true">TeamManager v{{ environment.version }}</div>
      </form>
      }

      <!-- ── ŞİFRE DEĞİŞTİR FORMU ── -->
      @if (mode === 'change') {
      <form (ngSubmit)="changePassword()" autocomplete="off" novalidate>
        <div class="auth-header">
          <div class="brand">
            <div class="brand-mark cp-mark">🔑</div>
            <div>
              <div class="title">Şifre Değiştir</div>
              <div class="muted small" style="margin-top:2px;">Mevcut şifrenle yeni şifre belirle</div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Email</label>
          <input class="input" type="email" name="cpEmail" [(ngModel)]="cpEmail"
                 placeholder="ornek@gmail.com" required />
        </div>

        <div class="field">
          <label>Mevcut Şifre</label>
          <div class="password-row">
            <input class="input" [type]="showCpCurrent ? 'text' : 'password'" name="cpCurrent"
                   [(ngModel)]="cpCurrent" placeholder="••••••••" required />
            <button type="button" class="chip-btn" (click)="showCpCurrent = !showCpCurrent">
              {{ showCpCurrent ? 'Gizle' : 'Göster' }}
            </button>
          </div>
        </div>

        <div class="field">
          <label>Yeni Şifre</label>
          <div class="password-row">
            <input class="input" [type]="showCpNew ? 'text' : 'password'" name="cpNew"
                   [(ngModel)]="cpNew" placeholder="En az 6 karakter" required />
            <button type="button" class="chip-btn" (click)="showCpNew = !showCpNew">
              {{ showCpNew ? 'Gizle' : 'Göster' }}
            </button>
          </div>
        </div>

        @if (error)   { <div class="msg-box err">{{ error }}</div> }
        @if (success) { <div class="msg-box ok">✓ {{ success }}</div> }

        <button class="btn-primary btn-teal" type="submit" [disabled]="loading">
          @if (!loading) { <span>Şifreyi Güncelle</span> }
          @if (loading)  { <span>Güncelleniyor…</span> }
        </button>

        <div class="login-version" (click)="changelogOpen = true">TeamManager v{{ environment.version }}</div>
      </form>
      }

    </div>
  </div>
</div>

<!-- ── CHANGELOG MODAL ── -->
@if (changelogOpen) {
<div class="cl-backdrop" (click)="changelogOpen = false">
  <div class="cl-modal card" (click)="$event.stopPropagation()">
    <div class="cl-head">
      <div class="cl-title">Sürüm Notları</div>
      <button type="button" class="cl-close" (click)="changelogOpen = false">✕</button>
    </div>
    <div class="cl-body">
      @for (v of changelog; track v.version) {
        <div class="cl-entry" [class.latest]="$first">
          <div class="cl-ver-row">
            <span class="cl-ver">v{{ v.version }}</span>
            @if ($first) { <span class="cl-badge">Güncel</span> }
            <span class="cl-date">{{ v.date }}</span>
          </div>
          <ul class="cl-list">
            @for (item of v.items; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </div>
      }
    </div>
  </div>
</div>
}
`,
  styles: [`
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card {
  width: min(520px, 94vw);
  padding: 0;
  position: relative;
}

/* Glow — renk moda göre değişiyor */
.auth-card::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: calc(var(--radius) + 2px);
  background: radial-gradient(600px 140px at 20% 0%, rgba(120,90,255,.25), transparent 55%);
  pointer-events: none;
  transition: background 0.5s ease;
  z-index: 0;
}

.auth-card.mode-change::before {
  background: radial-gradient(600px 140px at 20% 0%, rgba(0,200,175,.22), transparent 55%);
}

/* ── TABS ── */
.mode-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 5px;
  margin: 16px 16px 4px;
  background: rgba(255,255,255,.05);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  z-index: 1;
}

.tab-btn {
  position: relative;
  z-index: 2;
  padding: 9px;
  border: none;
  background: transparent;
  color: var(--text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  opacity: 0.48;
  transition: opacity 0.22s ease;
}

.tab-btn.active { opacity: 1; }

.tab-indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  width: calc(50% - 5px);
  bottom: 5px;
  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 8px;
  transition: transform 0.32s cubic-bezier(0.4,0,0.2,1),
              background 0.32s ease,
              border-color 0.32s ease;
}

.tab-indicator.right {
  transform: translateX(100%);
  background: rgba(0,200,175,.14);
  border-color: rgba(0,200,175,.30);
}

/* ── FORM ALANI ── */
.form-body {
  padding: 16px 26px 26px;
  position: relative;
  z-index: 1;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.form-body.exiting {
  opacity: 0;
  transform: translateY(10px) scale(0.982);
}

/* BAŞLIK */
.auth-header { margin-bottom: 18px; }

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: .6px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  flex-shrink: 0;
}

.cp-mark {
  font-size: 22px;
  background: rgba(0,200,175,.12);
  border-color: rgba(0,200,175,.28);
}

.title {
  font-size: 18px;
  font-weight: 800;
}

/* ALANLAR */
.field {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

label {
  font-size: 13px;
  opacity: .9;
}

.input {
  width: 100%;
  padding: 13px 14px;
  border-radius: 14px;
  outline: none;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  transition: border-color .12s, background .12s, box-shadow .12s;
  box-sizing: border-box;
}

.input:focus {
  border-color: rgba(255,255,255,.22);
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 3px rgba(120,90,255,.13);
}

.mode-change .input:focus {
  box-shadow: 0 0 0 3px rgba(0,200,175,.13);
}

.password-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.chip-btn {
  height: 46px;
  border-radius: 14px;
  padding: 0 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
  transition: background .12s;
  white-space: nowrap;
}
.chip-btn:hover  { background: rgba(255,255,255,.10); }
.chip-btn:active { transform: translateY(1px); }

/* MESAJLAR */
.msg-box {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  margin: 6px 0 12px;
}

.msg-box.err {
  border: 1px solid rgba(255,80,80,.35);
  background: rgba(255,80,80,.10);
  color: #ffd1d1;
}

.msg-box.ok {
  border: 1px solid rgba(0,210,140,.35);
  background: rgba(0,210,140,.10);
  color: #a8ffd6;
  animation: pop-in .28s cubic-bezier(.175,.885,.32,1.275);
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}

/* BUTONLAR */
.btn-primary {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: white;
  transition: transform .15s, box-shadow .15s;
}

.btn-teal {
  background: linear-gradient(135deg, #00c9a7, #0097b2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
}

.btn-primary:disabled {
  opacity: .6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.footer {
  text-align: center;
  margin-top: 10px;
}

.login-version {
  margin-top: 10px;
  text-align: center;
  font-size: 12px;
  opacity: .5;
  letter-spacing: .5px;
  cursor: pointer;
  transition: opacity .15s;
}
.login-version:hover { opacity: .85; }

/* ── CHANGELOG MODAL ── */
.cl-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 200;
  animation: cl-fade-in .18s ease;
}

@keyframes cl-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.cl-modal {
  width: min(440px, 92vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: cl-slide-in .22s cubic-bezier(.22,.68,0,1.2);
}

@keyframes cl-slide-in {
  from { opacity: 0; transform: translateY(16px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.cl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}

.cl-title { font-weight: 900; font-size: 15px; }

.cl-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  display: grid;
  place-items: center;
  transition: background .15s;
}
.cl-close:hover { background: rgba(255,255,255,.12); }

.cl-body {
  overflow-y: auto;
  padding: 14px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cl-entry {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.03);
}

.cl-entry.latest {
  border-color: rgba(124,92,255,.3);
  background: rgba(124,92,255,.07);
}

.cl-ver-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.cl-ver {
  font-weight: 900;
  font-size: 14px;
}

.cl-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  letter-spacing: .4px;
}

.cl-date {
  font-size: 11px;
  opacity: .4;
  margin-left: auto;
}

.cl-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cl-list li {
  font-size: 13px;
  opacity: .75;
  line-height: 1.5;
}
`]
})
export class LoginComponent {
  email = '';
  password = '';

  cpEmail = '';
  cpCurrent = '';
  cpNew = '';

  showPassword = false;
  showCpCurrent = false;
  showCpNew = false;

  loading = false;
  error = '';
  success = '';

  mode: 'login' | 'change' = 'login';
  exiting = false;
  changelogOpen = false;

  environment = environment;

  readonly changelog = [
    {
      version: '0.3.1 Beta',
      date: 'Mayıs 2026',
      items: [
        'Durum Akışı eklendi: ekip üyeleri anlık durum paylaşabilir',
        'Proje silme onayı kart üzeri animasyonlu overlay ile yenilendi',
        'Helivex → TeamManager marka güncellemesi',
      ]
    },
    {
      version: '0.3.0 Beta',
      date: 'Mayıs 2026',
      items: [
        'Oturum süresi artık uygulama kapatılınca otomatik sonlandırılıyor',
        'Raporda oturum süreleri maksimum 8 saat ile sınırlandırıldı',
        'Versiyon notları paneli eklendi',
      ]
    },
    {
      version: '0.2.0 Beta',
      date: 'Mayıs 2026',
      items: [
        'Navigasyon ve yönlendirme hataları düzeltildi',
        'Bildirim paneli iyileştirmeleri',
        'Genel arayüz güncellemeleri',
      ]
    },
    {
      version: '0.1.0 Beta',
      date: 'Nisan 2026',
      items: [
        'İlk beta sürümü yayınlandı',
        'Proje ve görev yönetimi',
        'Ekip yönetimi ve rol sistemi',
        'Oturum takibi ve raporlama',
      ]
    },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  switchMode(m: 'login' | 'change') {
    if (this.mode === m || this.exiting) return;
    this.exiting = true;
    this.error = '';
    this.success = '';
    this.cd.detectChanges();
    setTimeout(() => {
      this.mode = m;
      this.exiting = false;
      this.cd.detectChanges();
    }, 220);
  }

  submit() {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Email ve şifre zorunlu.';
      return;
    }
    this.loading = true;
    this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: res => {
        localStorage.setItem('tm_token', res.token);
        if (res.sessionId) localStorage.setItem('tm_session_id', String(res.sessionId));
        localStorage.removeItem('tm_session_saved');
        localStorage.setItem('tm_session_start', String(Date.now()));
        this.loading = false;
        this.router.navigateByUrl('/');
        this.cd.detectChanges();
      },
      error: err => {
        this.loading = false;
        this.error = err?.status === 401
          ? 'Email veya şifre hatalı.'
          : `Bağlantı hatası: ${err?.status ?? ''}`.trim();
        this.cd.detectChanges();
      }
    });
  }

  changePassword() {
    this.error = '';
    this.success = '';
    if (!this.cpEmail || !this.cpCurrent || !this.cpNew) {
      this.error = 'Tüm alanlar zorunlu.';
      return;
    }
    if (this.cpNew.length < 6) {
      this.error = 'Yeni şifre en az 6 karakter olmalı.';
      return;
    }
    this.loading = true;
    this.http.post(`${environment.apiUrl}/api/auth/change-password`, {
      email: this.cpEmail,
      currentPassword: this.cpCurrent,
      newPassword: this.cpNew
    }, { responseType: 'text' }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Şifreniz başarıyla güncellendi!';
        this.cpEmail = '';
        this.cpCurrent = '';
        this.cpNew = '';
        this.cd.detectChanges();
      },
      error: err => {
        this.loading = false;
        this.error = err?.error ?? 'Şifre güncellenemedi.';
        this.cd.detectChanges();
      }
    });
  }
}
