import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type WikiArticle = {
  id: number;
  title: string;
  content: string;
  authorName: string | null;
  authorId: number;
  createdAt: string;
  updatedAt: string;
};

@Component({
  selector: 'app-wiki-detail',
  standalone: true,
  imports: [HeaderComponent],
  template: `
<div class="container">
  <app-header title="Wiki" subtitle="Bilgi tabanı">
    <button type="button" class="back-btn" (click)="goBack()">← Geri</button>
  </app-header>

  @if (loading) {
    <div class="loader-row">
      <div class="spinner"></div>
      <span>Yükleniyor…</span>
    </div>
  }

  @if (!loading && !article) {
    <div class="err-box">Makale bulunamadı.</div>
  }

  @if (!loading && article) {
    <div class="hero card">
      <div class="hero-glow"></div>
      <div class="hero-inner">
        <div class="article-title">{{ article.title }}</div>
        <div class="meta">
          <div class="author-chip">
            <div class="av">{{ initial(article.authorName) }}</div>
            <span>{{ article.authorName || 'Bilinmiyor' }}</span>
          </div>
          <span class="dot">·</span>
          <span>{{ fmt(article.createdAt) }}</span>
          @if (wasEdited) {
            <span class="dot">·</span>
            <span class="edited">düzenlendi {{ fmt(article.updatedAt) }}</span>
          }
        </div>
      </div>
    </div>

    <div class="card content-card">
      <div class="article-body">{{ article.content }}</div>

      @if (canEdit) {
        <div class="actions">
          @if (!confirmingDelete) {
            <button type="button" class="act-btn edit-btn"
                    (click)="goEdit()">
              ✏️ Düzenle
            </button>
            <button type="button" class="act-btn del-btn"
                    (click)="confirmingDelete = true">
              🗑 Sil
            </button>
          } @else {
            <span class="confirm-text">Bu makaleyi silmek istediğinden emin misin?</span>
            <button type="button" class="act-btn del-yes-btn" (click)="doDelete()">Evet, Sil</button>
            <button type="button" class="act-btn cancel-btn"  (click)="confirmingDelete = false">Vazgeç</button>
          }
        </div>
      }
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

.err-box {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,80,80,.10);
  border: 1px solid rgba(255,80,80,.35);
  color: #ffd1d1;
  font-size: 14px;
}

/* ── Hero ── */
.hero {
  padding: 32px 36px;
  margin-bottom: 14px;
  position: relative;
  overflow: hidden;
  animation: slide-in .4s cubic-bezier(.22,.68,0,1.2);
}

.hero-glow {
  position: absolute;
  inset: -1px;
  background: radial-gradient(600px 200px at 0% 50%, rgba(124,92,255,.12), transparent 60%);
  pointer-events: none;
}

.hero-inner { position: relative; z-index: 1; }

.article-title {
  font-size: 28px;
  font-weight: 900;
  line-height: 1.25;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 60%, rgba(180,160,255,.9));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  opacity: .6;
}

.author-chip {
  display: flex;
  align-items: center;
  gap: 8px;
}

.av {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.dot    { opacity: .4; }
.edited { font-style: italic; opacity: .5; }

/* ── Content ── */
.content-card {
  padding: 32px 36px;
  animation: slide-in .4s cubic-bezier(.22,.68,0,1.2) .07s both;
}

.article-body {
  font-size: 15px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
  opacity: .9;
}

/* ── Actions ── */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,.07);
  flex-wrap: wrap;
}

.confirm-text {
  font-size: 13px;
  opacity: .65;
  margin-right: 4px;
}

.act-btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s, transform .12s, box-shadow .15s;
}
.act-btn:hover { transform: translateY(-1px); }

.edit-btn {
  border: 1px solid rgba(124,92,255,.35);
  background: rgba(124,92,255,.10);
  color: var(--text);
}
.edit-btn:hover {
  background: rgba(124,92,255,.22);
  box-shadow: 0 4px 14px rgba(124,92,255,.2);
}

.del-btn {
  border: 1px solid rgba(255,80,80,.25);
  background: rgba(255,80,80,.07);
  color: var(--text);
}
.del-btn:hover {
  background: rgba(255,80,80,.16);
  box-shadow: 0 4px 14px rgba(255,80,80,.15);
}

.del-yes-btn {
  border: none;
  background: rgba(255,80,80,.8);
  color: white;
}
.del-yes-btn:hover { background: rgba(255,80,80,1); }

.cancel-btn {
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: var(--text);
}
.cancel-btn:hover { background: rgba(255,255,255,.10); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slide-in {
  from { opacity: 0; transform: translateY(18px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`]
})
export class WikiDetailComponent implements OnInit {
  article: WikiArticle | null = null;
  loading = false;
  canEdit = false;
  confirmingDelete = false;

  get wasEdited(): boolean {
    if (!this.article) return false;
    return new Date(this.article.updatedAt).getTime() - new Date(this.article.createdAt).getTime() > 60_000;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || idParam === 'new' || isNaN(Number(idParam))) return;
    const id = Number(idParam);
    this.loading = true;
    this.http.get<WikiArticle>(`${environment.apiUrl}/api/wiki/${id}`).subscribe({
      next: (a) => {
        this.article = a;
        this.loading = false;
        this.canEdit = a.authorId === this.auth.getUserId() || this.auth.isAdmin();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        this.cd.detectChanges();
      }
    });
  }

  goBack(): void { this.router.navigateByUrl('/wiki'); }
  goEdit(): void { if (this.article) this.router.navigateByUrl(`/wiki/${this.article.id}/edit`); }

  doDelete(): void {
    if (!this.article) return;
    this.http.delete(`${environment.apiUrl}/api/wiki/${this.article.id}`).subscribe({
      next: () => this.router.navigateByUrl('/wiki'),
      error: () => { this.confirmingDelete = false; this.cd.detectChanges(); }
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
