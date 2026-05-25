import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type WikiItem = {
  id: number;
  title: string;
  preview: string;
  authorName: string | null;
  authorId: number;
  createdAt: string;
  updatedAt: string;
};

@Component({
  selector: 'app-wiki-list',
  standalone: true,
  imports: [HeaderComponent],
  template: `
<div class="container">
  <app-header title="Wiki" subtitle="Ekip bilgi tabanı">
    <button type="button" class="new-btn" (click)="goNew()">+ Yeni Makale</button>
  </app-header>

  @if (loading) {
    <div class="loader-row">
      <div class="spinner"></div>
      <span>Yükleniyor…</span>
    </div>
  }

  @if (!loading && articles.length === 0) {
    <div class="empty">
      <div class="empty-icon">📄</div>
      <div class="empty-title">Henüz makale yok</div>
      <p class="muted">İlk makaleyi sen yaz, ekibine katkı sağla.</p>
      <button type="button" class="new-btn" style="margin-top:18px" (click)="goNew()">Makale Yaz</button>
    </div>
  }

  @if (!loading && articles.length > 0) {
    <div class="grid">
      @for (a of articles; track a.id; let i = $index) {
        <div class="wiki-card card" [style.animation-delay]="(i * 0.055) + 's'" (click)="open(a.id)">
          <div class="top-bar"></div>
          <div class="body">
            <div class="title">{{ a.title }}</div>
            <div class="preview">{{ a.preview }}</div>
          </div>
          <div class="footer">
            <div class="author">
              <div class="av">{{ initial(a.authorName) }}</div>
              <span class="author-name">{{ a.authorName || 'Bilinmiyor' }}</span>
            </div>
            <span class="date">{{ fmt(a.updatedAt) }}</span>
          </div>
        </div>
      }
    </div>
  }
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
  transition: transform .13s, box-shadow .15s, opacity .15s;
}
.new-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(120,90,255,.35); }
.new-btn:active { transform: translateY(0); box-shadow: none; }

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

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.wiki-card {
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slide-in .4s cubic-bezier(.22,.68,0,1.2) both;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.wiki-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 18px 44px rgba(0,0,0,.32), 0 0 0 1px rgba(124,92,255,.28);
  border-color: rgba(124,92,255,.35);
}

.top-bar {
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--primary-2));
  opacity: 0;
  transition: opacity .2s;
}
.wiki-card:hover .top-bar { opacity: 1; }

.body {
  padding: 20px 20px 14px;
  flex: 1;
}

.title {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
  margin-bottom: 8px;
  transition: color .15s;
}
.wiki-card:hover .title {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.preview {
  font-size: 13px;
  opacity: .5;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.footer {
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255,255,255,.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
}
.av {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
.author-name {
  font-size: 12px;
  font-weight: 600;
  opacity: .6;
}
.date {
  font-size: 11px;
  opacity: .35;
  white-space: nowrap;
}

@keyframes spin     { to { transform: rotate(360deg); } }
@keyframes slide-in {
  from { opacity: 0; transform: translateY(20px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`]
})
export class WikiListComponent implements OnInit {
  articles: WikiItem[] = [];
  loading = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.http.get<WikiItem[]>(`${environment.apiUrl}/api/wiki`).subscribe({
      next: (data) => {
        this.articles = data ?? [];
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

  open(id: number): void  { this.router.navigateByUrl(`/wiki/${id}`); }
  goNew(): void           { this.router.navigateByUrl('/wiki/new'); }

  initial(name: string | null): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  fmt(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
