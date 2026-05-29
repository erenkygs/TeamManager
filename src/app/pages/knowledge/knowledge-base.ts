import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type KnowledgeItem = {
  id: number;
  question: string;
  answer: string;
  authorId: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [HeaderComponent, FormsModule],
  template: `
<div class="container">
  <app-header title="Bilgi Bankası" subtitle="Sıkça sorulan sorular">
    <button type="button" class="new-btn" (click)="openForm()">+ Soru Ekle</button>
  </app-header>

  <!-- Arama -->
  <div class="search-wrap">
    <input
      class="search-input"
      type="text"
      placeholder="Soru ara…"
      [(ngModel)]="query"
    />
  </div>

  <!-- Yeni soru formu -->
  @if (formOpen) {
    <div class="form-card card">
      <div class="form-title">{{ editId ? 'Soruyu Düzenle' : 'Yeni Soru' }}</div>
      <input
        class="field"
        type="text"
        placeholder="Soru"
        [(ngModel)]="formQ"
        maxlength="300"
      />
      <textarea
        class="field textarea"
        placeholder="Cevap"
        [(ngModel)]="formA"
        rows="4"
      ></textarea>
      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancelForm()">İptal</button>
        <button type="button" class="btn-save" (click)="save()" [disabled]="saving || !formQ.trim() || !formA.trim()">
          {{ saving ? 'Kaydediliyor…' : (editId ? 'Güncelle' : 'Kaydet') }}
        </button>
      </div>
    </div>
  }

  <!-- Yükleniyor -->
  @if (loading) {
    <div class="loader-row">
      <div class="spinner"></div>
      <span>Yükleniyor…</span>
    </div>
  }

  <!-- Boş durum -->
  @if (!loading && filtered.length === 0 && !formOpen) {
    <div class="empty">
      <div class="empty-icon">💡</div>
      <div class="empty-title">{{ query ? 'Sonuç bulunamadı' : 'Henüz soru yok' }}</div>
      <p class="muted">{{ query ? 'Farklı bir arama deneyin.' : 'İlk soruyu sen ekle.' }}</p>
    </div>
  }

  <!-- SSS listesi -->
  <div class="faq-list">
    @for (item of filtered; track item.id) {
      <div class="faq-card card" [class.open]="openId === item.id">
        <div class="faq-header" (click)="toggle(item.id)">
          <div class="faq-q">{{ item.question }}</div>
          <div class="faq-chevron">{{ openId === item.id ? '▲' : '▼' }}</div>
        </div>
        @if (openId === item.id) {
          <div class="faq-body">
            <div class="faq-answer">{{ item.answer }}</div>
            <div class="faq-meta">
              <div class="author">
                <div class="av">{{ initial(item.authorName) }}</div>
                <span class="author-name">{{ item.authorName || 'Bilinmiyor' }}</span>
              </div>
              <div class="meta-right">
                <span class="date">{{ fmt(item.updatedAt) }}</span>
                @if (canEdit(item)) {
                  <button type="button" class="action-btn edit" (click)="startEdit(item); $event.stopPropagation()">Düzenle</button>
                  <button type="button" class="action-btn del"  (click)="remove(item); $event.stopPropagation()">Sil</button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  </div>
</div>
`,
  styles: [`
.new-btn {
  padding: 9px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform .13s, box-shadow .15s;
}
.new-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(120,90,255,.35); }
.new-btn:active { transform: translateY(0); box-shadow: none; }

.search-wrap {
  margin-bottom: 16px;
}
.search-input {
  width: 100%;
  max-width: 480px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.search-input:focus {
  border-color: rgba(124,92,255,.5);
  box-shadow: 0 0 0 3px rgba(124,92,255,.12);
}

.form-card {
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-title {
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 2px;
}
.field {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  resize: none;
}
.field:focus {
  border-color: rgba(124,92,255,.5);
  box-shadow: 0 0 0 3px rgba(124,92,255,.12);
}
.textarea { line-height: 1.6; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-cancel {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
}
.btn-cancel:hover { background: rgba(255,255,255,.07); }
.btn-save {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: opacity .15s;
}
.btn-save:disabled { opacity: .45; cursor: default; }

.loader-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  opacity: .65;
  font-size: 14px;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 72px 20px;
  text-align: center;
}
.empty-icon  { font-size: 52px; margin-bottom: 6px; opacity: .55; }
.empty-title { font-size: 22px; font-weight: 800; }

.faq-list { display: flex; flex-direction: column; gap: 8px; }

.faq-card {
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.faq-card.open {
  border-color: rgba(124,92,255,.3);
  box-shadow: 0 8px 28px rgba(0,0,0,.28), 0 0 0 1px rgba(124,92,255,.18);
}

.faq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background .15s;
}
.faq-header:hover { background: rgba(255,255,255,.04); }

.faq-q {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}
.faq-chevron {
  font-size: 11px;
  opacity: .45;
  flex-shrink: 0;
}

.faq-body {
  padding: 0 20px 18px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.faq-answer {
  font-size: 14px;
  line-height: 1.75;
  opacity: .78;
  padding-top: 14px;
  white-space: pre-wrap;
}

.faq-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.05);
}
.author { display: flex; align-items: center; gap: 8px; }
.av {
  width: 24px; height: 24px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: grid; place-items: center;
  font-size: 11px; font-weight: 800; flex-shrink: 0;
}
.author-name { font-size: 12px; font-weight: 600; opacity: .55; }
.meta-right { display: flex; align-items: center; gap: 8px; }
.date { font-size: 11px; opacity: .3; white-space: nowrap; }

.action-btn {
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.action-btn.edit:hover { background: rgba(124,92,255,.15); border-color: rgba(124,92,255,.3); }
.action-btn.del:hover  { background: rgba(255,80,80,.12);  border-color: rgba(255,80,80,.3); }

@keyframes spin { to { transform: rotate(360deg); } }
`]
})
export class KnowledgeBaseComponent implements OnInit {
  items: KnowledgeItem[] = [];
  loading = false;
  query = '';
  openId: number | null = null;

  formOpen = false;
  editId: number | null = null;
  formQ = '';
  formA = '';
  saving = false;

  private currentUserId = 0;
  private currentRole = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserId() ?? 0;
    this.currentRole = this.auth.getRole() ?? '';

    this.loading = true;
    this.http.get<KnowledgeItem[]>(`${environment.apiUrl}/api/knowledge`).subscribe({
      next: (data) => { this.items = data ?? []; this.loading = false; this.cd.detectChanges(); },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); }
        this.cd.detectChanges();
      }
    });
  }

  get filtered(): KnowledgeItem[] {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.items;
    return this.items.filter(i =>
      i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)
    );
  }

  toggle(id: number): void {
    this.openId = this.openId === id ? null : id;
  }

  canEdit(item: KnowledgeItem): boolean {
    return item.authorId === this.currentUserId || this.currentRole === 'Admin' || this.currentRole === 'Lead';
  }

  openForm(): void {
    this.editId = null;
    this.formQ = '';
    this.formA = '';
    this.formOpen = true;
  }

  startEdit(item: KnowledgeItem): void {
    this.editId = item.id;
    this.formQ = item.question;
    this.formA = item.answer;
    this.formOpen = true;
    this.openId = null;
  }

  cancelForm(): void {
    this.formOpen = false;
    this.editId = null;
  }

  save(): void {
    if (this.saving || !this.formQ.trim() || !this.formA.trim()) return;
    this.saving = true;
    const body = { question: this.formQ.trim(), answer: this.formA.trim() };

    if (this.editId) {
      this.http.put(`${environment.apiUrl}/api/knowledge/${this.editId}`, body).subscribe({
        next: () => {
          const item = this.items.find(i => i.id === this.editId!);
          if (item) { item.question = body.question; item.answer = body.answer; }
          this.saving = false;
          this.formOpen = false;
          this.editId = null;
          this.cd.detectChanges();
        },
        error: () => { this.saving = false; this.cd.detectChanges(); }
      });
    } else {
      this.http.post<KnowledgeItem>(`${environment.apiUrl}/api/knowledge`, body).subscribe({
        next: (created) => {
          this.items = [created, ...this.items];
          this.saving = false;
          this.formOpen = false;
          this.cd.detectChanges();
        },
        error: () => { this.saving = false; this.cd.detectChanges(); }
      });
    }
  }

  remove(item: KnowledgeItem): void {
    if (!confirm(`"${item.question}" sorusunu silmek istiyor musun?`)) return;
    this.http.delete(`${environment.apiUrl}/api/knowledge/${item.id}`).subscribe({
      next: () => {
        this.items = this.items.filter(i => i.id !== item.id);
        if (this.openId === item.id) this.openId = null;
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }

  initial(name: string | null): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  fmt(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
