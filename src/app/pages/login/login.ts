import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

type LoginResponse = { token: string };
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="auth-shell">
  <div class="auth-card card">
    <div class="auth-header">
      <div class="brand">
        <div class="brand-mark">TM</div>
        <div>
          <div class="title">TeamManager</div>
          <div class="muted small" style="margin-top:2px;">Hesabına giriş yap</div>
        </div>
      </div>
    </div>

    <form (ngSubmit)="submit()" autocomplete="on" novalidate>
      <div class="field">
        <label>Email</label>
        <input class="input"
               type="email"
               name="email"
               [(ngModel)]="email"
               placeholder="ornek@mail.com"
               autocomplete="email"
               required />
      </div>
      <div class="field">
        <label>Şifre</label>
        <div class="password-row">
          <input class="input"
                 [type]="showPassword ? 'text' : 'password'"
                 name="password"
                 [(ngModel)]="password"
                 placeholder="••••••••"
                 autocomplete="current-password"
                 required />

          <button type="button" class="chip-btn" (click)="togglePassword()">
            {{ showPassword ? 'Gizle' : 'Göster' }}
          </button>
        </div>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>

      <button class="btn-primary" type="submit" [disabled]="loading">
        <span *ngIf="!loading">Giriş</span>
        <span *ngIf="loading">Giriş yapılıyor…</span>
      </button>

      <div class="muted small footer">
        Devam ederek kullanım koşullarını kabul etmiş olursun.
      </div>
    </form>
  </div>
</div>
`,
  styles: [`
/* Sayfa ortalama */
.auth-shell{
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

/* Cam kart */
.auth-card{
  width: min(520px, 94vw);
  padding: 26px;
  border-radius: var(--radius);
  position: relative;
}

/* Hafif glow  */
.auth-card:before{
  content:'';
  position:absolute;
  inset:-2px;
  border-radius: calc(var(--radius) + 2px);
  background: radial-gradient(600px 140px at 20% 0%, rgba(120,90,255,.25), transparent 55%);
  pointer-events:none;
}

.auth-header{ margin-bottom: 16px; }

/* Logo + başlık */
.brand{
  display:flex;
  gap:12px;
  align-items:center;
}

.brand-mark{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display:grid;
  place-items:center;
  font-weight: 800;
  letter-spacing: .6px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}

.title{
  font-size: 18px;
  font-weight: 800;
}

/* Form alanları */
.field{
  display:grid;
  gap:6px;
  margin-bottom: 14px;
}

label{
  font-size: 13px;
  opacity: .9;
}

.input{
  width: 100%;
  padding: 13px 14px;
  border-radius: 14px;
  outline: none;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  transition: .12s;
}

.input:focus{
  border-color: rgba(255,255,255,.22);
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 3px rgba(120,90,255,.12);
}

.password-row{
  display:grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items:center;
}

/* Göster/Gizle */
.chip-btn{
  height: 46px;
  border-radius: 14px;
  padding: 0 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
  transition: .12s;
}
.chip-btn:hover{ background: rgba(255,255,255,.10); }
.chip-btn:active{ transform: translateY(1px); }

/* Hata kutusu */
.error{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 80, 80, .35);
  background: rgba(255, 80, 80, .10);
  color: #ffd1d1;
  font-size: 13px;
  margin: 6px 0 12px 0;
}

/* Primary button (global'e bağlı değil, burada hazır) */
.btn-primary{
  width:100%;
  padding:12px 14px;
  border-radius:14px;
  font-weight:800;
  border:none;
  cursor:pointer;
  background: linear-gradient(135deg,var(--primary),var(--primary-2));
  color:white;
  transition:.15s;
}

.btn-primary:hover{
  transform:translateY(-1px);
  box-shadow:0 6px 18px rgba(0,0,0,.25);
}

.btn-primary:disabled{
  opacity:.6;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.footer{
  text-align:center;
  margin-top: 10px;
}
`]
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  togglePassword() {
    this.showPassword = !this.showPassword;
    this.cd.detectChanges();
  }

  submit() {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Email ve şifre zorunlu.';
      this.cd.detectChanges();
      return;
    }

    this.loading = true;
    this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        localStorage.setItem('tm_token', res.token);
        this.loading = false;
        this.router.navigateByUrl('/');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) {
          this.error = 'Email veya şifre hatalı.';
        } else {
          this.error = `API hata: ${err?.status ?? ''} ${err?.statusText ?? ''}`.trim();
        }
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }
}
