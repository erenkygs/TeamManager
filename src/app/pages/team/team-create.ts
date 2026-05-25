import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Çalışan Ekle" subtitle="Yeni ekip üyesi oluştur">
    <button type="button" class="btn" (click)="back()">← Geri</button>
  </app-header>

  <div class="form-wrap">
    <div class="form-card card">

      @if (error) { <div class="msg-box err">{{ error }}</div> }
      @if (ok)    { <div class="msg-box ok">✓ {{ ok }}</div> }

      <div class="grid">
        <div class="field">
          <label>Ad Soyad</label>
          <input class="input" [(ngModel)]="name" placeholder="Örn: Eren Yılmaz" />
        </div>

        <div class="field">
          <label>Email</label>
          <input class="input" type="email" [(ngModel)]="email" placeholder="eren@example.com" />
        </div>

        <div class="two-col">
          <div class="field">
            <label>Rol</label>
            <select class="input select" [(ngModel)]="role">
              <option value="Junior">Üye</option>
              <option value="Lead">Lead</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div class="field">
            <label>Ünvan</label>
            <input class="input" [(ngModel)]="jobTitle" placeholder="Örn: JR Developer" />
          </div>
        </div>

        <div class="field">
          <label>Şifre</label>
          <div class="pw-row">
            <input class="input" [type]="showPw ? 'text' : 'password'"
                   [(ngModel)]="password" placeholder="En az 6 karakter" />
            <button type="button" class="chip-btn" (click)="showPw = !showPw">
              {{ showPw ? 'Gizle' : 'Göster' }}
            </button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="action-btn cancel-btn" type="button" (click)="back()">İptal</button>
        <button class="action-btn save-btn" type="button"
                [disabled]="saving || !canSave()" (click)="save()">
          @if (!saving) { <span>Kaydet</span> }
          @if (saving)  { <span>Kaydediliyor…</span> }
        </button>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
.form-wrap {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.form-card {
  width: min(700px, 100%);
  padding: 28px;
  position: relative;
  animation: card-in .35s cubic-bezier(.22,.68,0,1.2);
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.form-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(700px 220px at 10% 0%, rgba(120,90,255,.22), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field {
  display: grid;
  gap: 7px;
}

label {
  font-size: 13px;
  font-weight: 700;
  opacity: .88;
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
  border-color: rgba(120,90,255,.55);
  box-shadow: 0 0 0 3px rgba(120,90,255,.13);
}

.select {
  cursor: pointer;
  color-scheme: dark;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,.45)' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.select option { background: #0f1420; }

.pw-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.chip-btn {
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
.chip-btn:hover { background: rgba(255,255,255,.11); }

.msg-box {
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
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

.actions {
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

.action-btn:hover   { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.28); }
.action-btn:active  { transform: translateY(0); box-shadow: none; }
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
`]
})
export class TeamCreateComponent {
  name = '';
  email = '';
  role: 'Junior' | 'Lead' | 'Admin' = 'Junior';
  jobTitle = '';
  password = '';
  showPw = false;

  saving = false;
  error = '';
  ok = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  back(): void { this.router.navigateByUrl('/team'); }

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
      title: this.jobTitle?.trim() || null,
    };

    this.http.post(`${environment.apiUrl}/api/auth/register`, body, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.saving = false;
          this.ok = 'Çalışan eklendi';
          this.cd.detectChanges();
          setTimeout(() => this.router.navigateByUrl('/team'), 700);
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

          this.error = `${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
          console.error(err);
          this.cd.detectChanges();
        }
      });
  }
}
