import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Çalışan Ekle" subtitle="Yeni ekip üyesi oluştur">
    <button class="btn" (click)="back()">Geri</button>
  </app-header>

  <div *ngIf="error" class="api-error">{{ error }}</div>
  <div *ngIf="ok" class="ok">{{ ok }}</div>

<div class="card" style="padding:16px;max-width:720px;margin:16px auto;">        
    <div style="display:grid;gap:12px;">
      <div>
        <div class="muted small" style="margin-bottom:6px;">Ad Soyad</div>
        <input class="input" [(ngModel)]="name" placeholder="Örn: Eren Yılmaz" />
      </div>

      <div>
        <div class="muted small" style="margin-bottom:6px;">Email</div>
        <input class="input" [(ngModel)]="email" placeholder="eren@example.com" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <div class="muted small" style="margin-bottom:6px;">Rol</div>
         <select class="select" [(ngModel)]="role">
            <option value="Junior">Üye</option>
            <option value="Lead">Lead</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div>
          <div class="muted small" style="margin-bottom:6px;">Ünvan</div>
          <input class="input" [(ngModel)]="title" placeholder="Örn: JR Developer" />
        </div>
      </div>
      <div>
        <div class="muted small" style="margin-bottom:6px;">Şifre</div>
        <input class="input" type="password" [(ngModel)]="password" placeholder="En az 6 karakter" />
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
        <button class="btn" type="button" (click)="back()">İptal</button>
        <button class="btn primary" type="button" [disabled]="saving || !canSave()" (click)="save()">
          {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
        </button>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
.api-error{ margin-top:10px; color:#ff7b90; font-weight:700; }
.ok{ margin-top:10px; color:#7dffb3; font-weight:800; }

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
.select{
  width:100%;
  padding:10px 12px;
  border-radius:12px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  color: var(--text);
  outline:none;
  color-scheme: dark;
  appearance:none;
  -webkit-appearance:none;
}
.select option{
  background:#0f1420;
  color:#fff;
}
`]
})
export class TeamCreateComponent {
  name = '';
  email = '';
  role: 'Junior' | 'Lead' | 'Admin' = 'Junior';
  title = '';
  password = '';

  saving = false;
  error = '';
  ok = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  back(): void {
    this.router.navigateByUrl('/team');
  }

  canSave(): boolean {
    return !!this.name.trim() && !!this.email.trim() && this.password.length >= 6;
  }

  save(): void {
    this.error = '';
    this.ok = '';
    this.saving = true;

    const body = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
      role: this.role,
      title: this.title?.trim() || null,
    };

    this.http.post(`${environment.apiUrl}/api/auth/register`, body, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.saving = false;
          this.ok = 'Çalışan eklendi ✅';
          this.cd.detectChanges();

          setTimeout(() => this.router.navigateByUrl('/team'), 600);
        },
        error: (err) => {
          this.saving = false;

          if (err?.status === 401) {
            this.auth.logout();
            this.router.navigateByUrl('/login');
            return;
          }

          let detail = '';
          if (typeof err?.error === 'string') detail = err.error;
          else if (err?.error?.errors) {
            const lines: string[] = [];
            for (const k of Object.keys(err.error.errors)) {
              const msgs = err.error.errors[k];
              if (Array.isArray(msgs)) lines.push(`${k}: ${msgs.join(', ')}`);
            }
            detail = lines.join(' | ');
          } else {
            detail = err?.error?.message || err?.error?.title || '';
          }

          this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
          console.error(err);
          this.cd.detectChanges();
        }
      });
  }
}