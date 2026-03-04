import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Profilim" subtitle="Hesap bilgileri ve şifre işlemleri"></app-header>

  <div *ngIf="error" class="api-error">{{ error }}</div>
  <div *ngIf="ok" class="ok">{{ ok }}</div>

  <div class="grid" style="margin-top:16px;">
    <div class="card" style="padding:16px;">
      <div style="font-weight:900;margin-bottom:12px;">Kullanıcı Bilgileri</div>

      <div *ngIf="loading" class="muted">Yükleniyor…</div>

      <ng-container *ngIf="!loading && me">
        <div class="row"><span class="muted small">Ad</span><span style="font-weight:800">{{ me.name || '-' }}</span></div>
        <div class="row"><span class="muted small">Email</span><span style="font-weight:800">{{ me.email || '-' }}</span></div>
        <div class="row"><span class="muted small">Rol</span><span style="font-weight:800">{{ me.role || '-' }}</span></div>
        <div class="row" *ngIf="me.createdAt">
          <span class="muted small">Kayıt</span>
          <span style="font-weight:800">{{ me.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
        </div>
      </ng-container>
    </div>

    <!-- Şifre Değiştir -->
    <div class="card" style="padding:16px;">
      <div style="font-weight:900;margin-bottom:12px;">Şifre Değiştir</div>

      <div class="muted small" style="margin-bottom:6px;">Mevcut şifre</div>
      <input class="input" type="password" [(ngModel)]="currentPassword" />

      <div class="muted small" style="margin:10px 0 6px;">Yeni şifre</div>
      <input class="input" type="password" [(ngModel)]="newPassword" />

      <div class="muted small" style="margin:10px 0 6px;">Yeni şifre (tekrar)</div>
      <input class="input" type="password" [(ngModel)]="newPassword2" />

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
        <button class="btn" type="button" (click)="clearPw()">Temizle</button>

        <button class="btn primary" type="button" [disabled]="saving" (click)="changePassword()">
          <span *ngIf="!saving">Kaydet</span>
          <span *ngIf="saving">Kaydediliyor…</span>
        </button>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
.grid{
  display:grid;
  gap:14px;
  grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
}
.row{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:10px 0;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.row:last-child{ border-bottom:none; }

.input{
  width:100%;
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
.ok{ margin-top:10px; color:#7dffb3; }
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

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadMe();
  }

  loadMe(): void {
    this.loading = true;
    this.error = '';
    this.ok = '';

    this.http.get<any>(`${environment.apiUrl}/api/users/me`).subscribe({
      next: (res) => {
        this.me = res;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleErr(err);
      }
    });
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
        this.ok = 'Şifre güncellendi ✅';
        this.clearPw();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.handleErr(err);
      }
    });
  }

  clearPw(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.newPassword2 = '';
    this.cd.detectChanges();
  }

  private handleErr(err: any): void {
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
}
