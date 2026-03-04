import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container">
    <div class="topbar">
      <div>
        <h1 class="h1">Proje Ekle</h1>
        <div class="muted" style="margin-top:6px;">Yeni proje oluştur</div>
      </div>

      <button class="btn" (click)="back()">Geri</button>
    </div>

    <div *ngIf="error" class="api-error">{{ error }}</div>

    <div class="wrap">
      <div class="card form">
        <div class="field">
          <div class="label muted small">Proje Adı</div>
          <input class="input" [(ngModel)]="name" placeholder="Örn: TeamManager" />
        </div>

        <div class="field">
          <div class="label muted small">Açıklama (opsiyonel)</div>
          <textarea class="input" rows="5" [(ngModel)]="description" placeholder="Kısa açıklama..."></textarea>
        </div>

        <div class="actions">
          <button class="btn" type="button" (click)="back()">İptal</button>
          <button class="btn primary" type="button" [disabled]="saving || !name.trim()" (click)="save()">
            {{ saving ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .topbar{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      margin-bottom:16px;
    }

    .h1{
      margin:0;
      font-weight:900;
      letter-spacing:.2px;
    }

    .wrap{
      margin-top:16px;
      display:flex;
      justify-content:center;
    }

    .card.form{
      width:min(680px, 100%);
      padding:18px;
      border-radius:18px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 16px 40px rgba(0,0,0,.35);
      backdrop-filter: blur(12px);
    }

    .field{
      display:grid;
      gap:8px;
      margin-bottom:14px;
    }

    .label{
      font-weight:800;
      font-size:13px;
      opacity:.9;
    }

    .input{
      width:100%;
      padding:10px 12px;
      border-radius:12px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.14);
      color: var(--text);
      outline:none;
    }

    .input:focus{
      background: rgba(255,255,255,.08);
      border-color: rgba(255,255,255,.24);
    }

    textarea.input{
      resize: vertical;
      min-height: 120px;
    }

    .actions{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      margin-top:8px;
    }

    .api-error{
      margin-top:10px;
      color:#ff7b90;
      font-weight:700;
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
  ) { }

  back() {
    this.router.navigateByUrl('/projects');
  }

  save() {
    this.error = '';
    this.saving = true;

    const body = {
      name: this.name.trim(),
      description: this.description.trim() ? this.description.trim() : null,
    };

    this.http.post(`${environment.apiUrl}/api/Projects`, body).subscribe({
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