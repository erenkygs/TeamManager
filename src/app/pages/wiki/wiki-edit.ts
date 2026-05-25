import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

@Component({
  selector: 'app-wiki-edit',
  standalone: true,
  imports: [HeaderComponent, FormsModule],
  template: `
<div class="container">
  <app-header
    [title]="isEdit ? 'Makaleyi Düzenle' : 'Yeni Makale'"
    subtitle="Wiki">
    <button type="button" class="back-btn" (click)="cancel()">← İptal</button>
  </app-header>

  @if (loading) {
    <div class="loader-row">
      <div class="spinner"></div>
      <span>Yükleniyor…</span>
    </div>
  }

  @if (!loading) {
    <div class="edit-card card">

      @if (error) {
        <div class="err-box">{{ error }}</div>
      }

      <div class="field">
        <label>Başlık</label>
        <input
          class="inp"
          type="text"
          [(ngModel)]="title"
          placeholder="Makale başlığı…"
          autocomplete="off"
          spellcheck="false" />
      </div>

      <div class="field">
        <label>İçerik</label>
        <textarea
          class="inp textarea"
          [(ngModel)]="content"
          placeholder="Makale içeriği…"
          autocomplete="off"
          spellcheck="false">
        </textarea>
      </div>

      <div class="btn-row">
        <button type="button" class="cancel-btn" (click)="cancel()">İptal</button>
        <button type="button" class="save-btn"
                (click)="save()"
                [disabled]="saving || !title.trim() || !content.trim()">
          {{ saving ? 'Kaydediliyor…' : (isEdit ? 'Güncelle' : 'Yayımla') }}
        </button>
      </div>

    </div>
  }
</div>
`,
  styles: [`
.back-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
}
.back-btn:hover { background: rgba(255,255,255,.10); }

.loader-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  opacity: .65;
  font-size: 14px;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.edit-card {
  padding: 28px 32px;
  animation: slide-in .35s cubic-bezier(.22,.68,0,1.2);
}

.err-box {
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 18px;
  border: 1px solid rgba(255,80,80,.35);
  background: rgba(255,80,80,.10);
  color: #ffd1d1;
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 18px;
}

label {
  font-size: 13px;
  font-weight: 700;
  opacity: .88;
}

.inp {
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
.inp:focus {
  background: rgba(255,255,255,.09);
  border-color: rgba(120,90,255,.55);
  box-shadow: 0 0 0 3px rgba(120,90,255,.13);
}

.textarea {
  min-height: 360px;
  resize: vertical;
  line-height: 1.7;
}

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.cancel-btn {
  padding: 10px 22px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background .15s, transform .12s;
}
.cancel-btn:hover { background: rgba(255,255,255,.11); transform: translateY(-1px); }

.save-btn {
  padding: 10px 26px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  min-width: 120px;
  transition: transform .13s, box-shadow .15s, opacity .15s;
}
.save-btn:hover:not(:disabled)  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(120,90,255,.35); }
.save-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.save-btn:disabled { opacity: .45; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slide-in {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`]
})
export class WikiEditComponent implements OnInit {
  title = '';
  content = '';
  loading = false;
  saving = false;
  error = '';
  isEdit = false;
  private articleId?: number;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit = true;
    this.articleId = Number(id);
    this.loading = true;

    this.http.get<any>(`${environment.apiUrl}/api/wiki/${this.articleId}`).subscribe({
      next: (a) => {
        this.title = a.title ?? '';
        this.content = a.content ?? '';
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        this.cd.detectChanges();
      }
    });
  }

  save(): void {
    this.error = '';
    this.saving = true;

    const body = { title: this.title.trim(), content: this.content.trim() };
    const req = this.isEdit
      ? this.http.put(`${environment.apiUrl}/api/wiki/${this.articleId}`, body)
      : this.http.post<{ id: number }>(`${environment.apiUrl}/api/wiki`, body);

    req.subscribe({
      next: (res: any) => {
        const id = this.isEdit ? this.articleId : res?.id;
        this.router.navigateByUrl(id ? `/wiki/${id}` : '/wiki');
      },
      error: (err) => {
        this.saving = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        this.error = 'Kayıt başarısız. Lütfen tekrar dene.';
        this.cd.detectChanges();
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.articleId) this.router.navigateByUrl(`/wiki/${this.articleId}`);
    else this.router.navigateByUrl('/wiki');
  }
}
