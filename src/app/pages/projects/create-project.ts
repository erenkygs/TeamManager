import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Proje Ekle" subtitle="Yeni proje oluştur">
    <button class="btn" (click)="back()">← Geri</button>
  </app-header>

  <div class="form-wrap">
    <div class="form-card card">

      @if (error) { <div class="msg-box err">{{ error }}</div> }

      <div class="grid">
        <div class="field">
          <label>Proje Adı</label>
          <input class="input" [(ngModel)]="name" placeholder="Örn: TeamManager" />
        </div>

        <div class="field">
          <label>Açıklama <span class="optional">(opsiyonel)</span></label>
          <textarea class="input" rows="5" [(ngModel)]="description"
                    placeholder="Kısa açıklama..."></textarea>
        </div>
      </div>

      <div class="actions">
        <button class="action-btn cancel-btn" type="button" (click)="back()">İptal</button>
        <button class="action-btn save-btn" type="button"
                [disabled]="saving || !name.trim()" (click)="save()">
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
  width: min(680px, 100%);
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
  background: radial-gradient(700px 220px at 10% 0%, rgba(31,111,255,.20), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
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

.optional {
  font-weight: 400;
  opacity: .55;
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
  border-color: rgba(31,111,255,.55);
  box-shadow: 0 0 0 3px rgba(31,111,255,.13);
}

textarea.input {
  resize: vertical;
  min-height: 130px;
}

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
export class CreateProjectComponent {
  name = '';
  description = '';
  saving = false;
  error = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  back() { this.router.navigateByUrl('/projects'); }

  save() {
    this.error = '';
    this.saving = true;

    this.http.post(`${environment.apiUrl}/api/Projects`, {
      name: this.name.trim(),
      description: this.description.trim() || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigateByUrl('/projects');
      },
      error: (err) => {
        this.saving = false;
        if (err?.status === 401) {
          this.auth.logout();
          this.router.navigateByUrl('/login');
          return;
        }
        this.error = `API hata: ${err?.status ?? ''} ${err?.statusText ?? ''}`;
        console.error(err);
        this.cd.detectChanges();
      },
    });
  }
}
