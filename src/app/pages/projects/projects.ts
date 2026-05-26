import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { finalize } from 'rxjs/operators';
import { HeaderComponent } from '../../layout/header.component';

type Project = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [HeaderComponent],
  template: `
<div class="container">
  <app-header title="Projeler" subtitle="Tüm projeler">
    @if (canManageProjects) {
      <button type="button" class="add-btn" (click)="addProject()">+ Proje Ekle</button>
    }
  </app-header>

  @if (loading) {
    <div class="loading-row"><div class="spinner"></div> Yükleniyor…</div>
  }
  @if (error) { <div class="err-box">{{ error }}</div> }

  @if (!loading && projects.length === 0) {
    <div class="empty-state">
      <div class="empty-icon">📂</div>
      <div class="empty-title">Henüz proje yok</div>
      <div class="muted">İlk projeyi oluşturmak için + Proje Ekle butonunu kullan.</div>
    </div>
  }

  @if (projects.length) {
    <div class="proj-grid">
      @for (p of projects; track p.id; let i = $index) {
        <div class="card proj-card" [class.is-confirming]="confirmingDeleteId === p.id" [style.animation-delay]="(i * 0.06) + 's'">
          <div class="proj-header">
            <div class="proj-name">{{ p.name }}</div>
            <div class="proj-icon">🗂️</div>
          </div>

          <div class="proj-desc muted">
            {{ p.description || 'Açıklama eklenmemiş' }}
          </div>

          <div class="proj-footer">
            <div class="proj-date muted small">{{ fmt(p.createdAt) }}</div>
            <div class="proj-actions">
              @if (canManageProjects) {
                <button type="button" class="action-btn del-btn"
                        (click)="confirmingDeleteId = p.id"
                        [disabled]="deleting[p.id]">
                  Sil
                </button>
              }
              <button type="button" class="action-btn detail-btn" (click)="openProject(p.id)">
                Detay →
              </button>
            </div>
          </div>

          @if (confirmingDeleteId === p.id) {
            <div class="del-overlay">
              <div class="del-trash">🗑️</div>
              <div class="del-msg">Bu proje silinecek!</div>
              <div class="del-sub muted small">Bu işlem geri alınamaz.</div>
              <div class="del-btns">
                <button type="button" class="del-cancel" (click)="confirmingDeleteId = null">Vazgeç</button>
                <button type="button" class="del-confirm" (click)="deleteProject(p)">Evet, Sil</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  }
</div>
`,
  styles: [`
@keyframes card-in {
  from { opacity: 0; transform: translateY(22px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Add button ── */
.add-btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform .13s, box-shadow .15s, opacity .15s;
}
.add-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(120,90,255,.35); }
.add-btn:active { transform: translateY(0); box-shadow: none; }

/* ── Grid ── */
.proj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 8px;
}

/* ── Project card ── */
.proj-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) both;
  cursor: default;
  transition: transform .18s ease, box-shadow .18s ease;
}

.proj-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(360px 180px at 0% 0%, rgba(31,111,255,.18), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.proj-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 18px 48px rgba(0,0,0,.32);
}

/* ── Card header ── */
.proj-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.proj-name {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.3;
}

.proj-icon {
  font-size: 22px;
  flex-shrink: 0;
  opacity: .7;
}

/* ── Description ── */
.proj-desc {
  min-height: 40px;
  font-size: 13px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Footer ── */
.proj-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.proj-date { font-size: 11px; }

.proj-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 7px 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform .12s, background .15s, box-shadow .15s;
}
.action-btn:hover  { transform: translateY(-1px); }
.action-btn:active { transform: translateY(0); }
.action-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

.del-btn {
  background: rgba(255,92,122,.10);
  border-color: rgba(255,92,122,.30);
  color: #ff8099;
}
.del-btn:hover { background: rgba(255,92,122,.18); box-shadow: 0 4px 14px rgba(255,92,122,.2); }

/* ── Delete overlay ── */
.is-confirming {
  border-color: rgba(255,60,95,.4) !important;
  box-shadow: 0 0 0 1px rgba(255,60,95,.25), 0 12px 40px rgba(255,60,95,.18) !important;
}

.del-overlay {
  position: absolute;
  inset: 0;
  border-radius: var(--radius, 16px);
  background: rgba(10,8,18,.88);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 10;
  animation: del-pop .28s cubic-bezier(.22,.68,0,1.25) both;
}

@keyframes del-pop {
  from { opacity: 0; transform: scale(.88); }
  to   { opacity: 1; transform: scale(1); }
}

.del-trash {
  font-size: 38px;
  animation: del-shake .55s cubic-bezier(.36,.07,.19,.97) .05s both;
}

@keyframes del-shake {
  0%,100% { transform: rotate(0) scale(1); }
  20%     { transform: rotate(-14deg) scale(1.18); }
  45%     { transform: rotate(13deg) scale(1.22); }
  65%     { transform: rotate(-8deg) scale(1.14); }
  80%     { transform: rotate(5deg); }
}

.del-msg {
  font-size: 15px;
  font-weight: 900;
  color: #ff8099;
  margin-top: 2px;
}

.del-sub { margin-bottom: 6px; }

.del-btns {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.del-cancel {
  padding: 9px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.07);
  color: var(--text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s, transform .12s;
}
.del-cancel:hover { background: rgba(255,255,255,.13); transform: translateY(-1px); }

.del-confirm {
  padding: 9px 22px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ff3c5f, #ff5e3a);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(255,60,95,.5);
  animation: pulse-danger 1.8s ease-in-out infinite;
  transition: transform .13s, box-shadow .15s;
}
.del-confirm:hover  { transform: translateY(-2px) scale(1.04); box-shadow: 0 8px 28px rgba(255,60,95,.65); animation: none; }
.del-confirm:active { transform: scale(.96); }

@keyframes pulse-danger {
  0%,100% { box-shadow: 0 4px 18px rgba(255,60,95,.5); }
  50%      { box-shadow: 0 4px 28px rgba(255,60,95,.75), 0 0 0 5px rgba(255,60,95,.12); }
}

.detail-btn {
  background: rgba(31,111,255,.12);
  border-color: rgba(31,111,255,.30);
  color: #80aaff;
}
.detail-btn:hover { background: rgba(31,111,255,.20); box-shadow: 0 4px 14px rgba(31,111,255,.2); }

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
  animation: card-in .4s ease;
}
.empty-icon  { font-size: 48px; opacity: .5; }
.empty-title { font-size: 18px; font-weight: 800; opacity: .8; }

/* ── Loading / error ── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
  opacity: .7;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.err-box {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255,80,80,.10);
  border: 1px solid rgba(255,80,80,.35);
  color: #ffd1d1;
  margin-bottom: 14px;
}
`]
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  loading = false;
  error = '';
  deleting: Record<number, boolean> = {};
  confirmingDeleteId: number | null = null;

  get canManageProjects(): boolean {
    return this.auth.hasAnyRole('Lead', 'Admin');
  }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.fetch(); }

  fetch() {
    this.loading = true;
    this.error = '';

    this.http.get<Project[]>(`${environment.apiUrl}/api/projects`).subscribe({
      next: (res) => {
        this.projects = res ?? [];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
        this.error = `API hata: ${err?.status ?? ''} ${err?.statusText ?? ''}`;
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  openProject(id: number) { this.router.navigateByUrl(`/projects/${id}`); }
  addProject()            { this.router.navigateByUrl('/projects/create'); }

  deleteProject(p: Project) {
    if (!this.canManageProjects) { this.error = 'Bu işlem için yetkin yok.'; return; }
    this.confirmingDeleteId = null;
    this.error = '';
    this.deleting[p.id] = true;
    const prev = this.projects;
    this.projects = this.projects.filter(x => x.id !== p.id);
    this.cd.detectChanges();

    this.http.delete(`${environment.apiUrl}/api/Projects/${p.id}`, { responseType: 'text' })
      .pipe(finalize(() => { delete this.deleting[p.id]; this.cd.detectChanges(); }))
      .subscribe({
        next: () => { this.cd.detectChanges(); },
        error: (err) => {
          this.projects = prev;
          if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
          this.error = `API hata: ${err?.status ?? ''} ${err?.statusText ?? ''}`;
          console.error(err);
          this.cd.detectChanges();
        }
      });
  }

  fmt(str: string): string {
    if (!str) return '';
    try {
      const d = new Date(str);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return str; }
  }
}
