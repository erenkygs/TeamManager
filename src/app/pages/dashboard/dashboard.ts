import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type LeaderItem = { userId: number; name: string | null; email: string | null; completed: number };
type DayItem = { date: string; completed: number };

type DashboardSummary = {
  totalTasks: number;
  todoTasks: number;
  doingTasks: number;
  doneTasks: number;
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
  leaderboard: LeaderItem[];
  completedLast7Days: DayItem[];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent],
  template: `
<div class="container">
  <app-header title="Ana Sayfa" subtitle="Genel özet"></app-header>

  @if (loading) {
    <div class="loading-row">
      <div class="spinner"></div> Yükleniyor…
    </div>
  }
  @if (error) { <div class="err-box">{{ error }}</div> }

  @if (data; as d) {
    <div class="top-grid">

      <!-- Tamamlanma yüzdesi halkası -->
      <div class="card ring-card">
        <div class="ring-label">Görev Tamamlanma</div>
        <div class="ring-wrap">
          <svg viewBox="0 0 200 200" class="ring-svg">
            <defs>
              <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="var(--primary)"/>
                <stop offset="100%" stop-color="var(--primary-2)"/>
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="80" class="ring-bg"/>
            <circle cx="100" cy="100" r="80" class="ring-progress"
                    [style.stroke-dashoffset]="ringOffset"/>
          </svg>
          <div class="ring-center">
            <div class="ring-pct">{{ completionPct }}<span class="ring-sym">%</span></div>
            <div class="ring-sub">tamamlandı</div>
          </div>
        </div>
        <div class="ring-stats">
          <div class="ring-stat">
            <div class="ring-stat-val done">{{ d.doneTasks }}</div>
            <div class="ring-stat-label">Tamamlanan</div>
          </div>
          <div class="ring-divider"></div>
          <div class="ring-stat">
            <div class="ring-stat-val">{{ d.totalTasks }}</div>
            <div class="ring-stat-label">Toplam</div>
          </div>
        </div>
      </div>

      <!-- Stat kartları -->
      <div class="stat-grid">
        <div class="card stat-card todo-card">
          <div class="stat-icon">📋</div>
          <div class="stat-val">{{ d.todoTasks }}</div>
          <div class="stat-name">Yapılacak</div>
        </div>
        <div class="card stat-card doing-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-val">{{ d.doingTasks }}</div>
          <div class="stat-name">Devam Eden</div>
        </div>
        <div class="card stat-card overdue-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-val">{{ d.overdueTasks }}</div>
          <div class="stat-name">Geciken</div>
        </div>
        <div class="card stat-card project-card">
          <div class="stat-icon">📁</div>
          <div class="stat-val">
            {{ d.activeProjects }}<span class="stat-total"> / {{ d.totalProjects }}</span>
          </div>
          <div class="stat-name">Aktif Proje</div>
        </div>
      </div>
    </div>

    <!-- Son 7 gün + Liderlik -->
    <div class="bottom-grid">
      <div class="card bottom-card">
        <div class="card-title">Son 7 Gün Tamamlanan</div>
        @if (d.completedLast7Days.length) {
          <div class="bar-list">
            @for (x of d.completedLast7Days; track x.date) {
              <div class="bar-row">
                <div class="bar-date">{{ x.date }}</div>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="barWidth(x.completed)"></div>
                </div>
                <div class="bar-val">{{ x.completed }}</div>
              </div>
            }
          </div>
        } @else {
          <div class="muted">Veri yok</div>
        }
      </div>

      <div class="card bottom-card">
        <div class="lb-head">
          <div class="card-title">Liderlik Tablosu</div>
          <div class="muted small">İlk 10</div>
        </div>
        @if (d.leaderboard.length) {
          <div class="lb-list">
            @for (u of d.leaderboard; track u.userId; let i = $index) {
              <div class="lb-row" [class.lb-top3]="i < 3">
                <div class="lb-rank">
                  @if (i === 0)      { <span>🥇</span> }
                  @else if (i === 1) { <span>🥈</span> }
                  @else if (i === 2) { <span>🥉</span> }
                  @else              { <span class="lb-num">{{ i + 1 }}</span> }
                </div>
                <div class="lb-info">
                  <div class="lb-name">{{ u.name || u.email || ('User ' + u.userId) }}</div>
                  @if (u.email) { <div class="muted small">{{ u.email }}</div> }
                </div>
                <div class="lb-count">{{ u.completed }}</div>
              </div>
            }
          </div>
        } @else {
          <div class="muted">Henüz veri yok.</div>
        }
      </div>
    </div>
  }
</div>
`,
  styles: [`
/* ── Top grid ── */
.top-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(20px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Ring card ── */
.ring-card {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2);
}

.ring-label {
  font-size: 12px;
  font-weight: 700;
  opacity: .6;
  text-transform: uppercase;
  letter-spacing: .06em;
  align-self: flex-start;
}

.ring-wrap {
  position: relative;
  width: 200px;
  height: 200px;
}

.ring-svg {
  width: 200px;
  height: 200px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,.07);
  stroke-width: 16;
}

.ring-progress {
  fill: none;
  stroke: url(#ring-grad);
  stroke-width: 16;
  stroke-linecap: round;
  stroke-dasharray: 502.65;
  stroke-dashoffset: 502.65;
  transition: stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 0 8px rgba(120,90,255,.55));
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-pct {
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ring-sym { font-size: 24px; font-weight: 700; }

.ring-sub { font-size: 12px; opacity: .5; margin-top: 4px; }

.ring-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  justify-content: center;
}

.ring-stat { text-align: center; }
.ring-stat-val { font-size: 26px; font-weight: 900; }
.ring-stat-val.done { color: rgba(0,210,140,1); }
.ring-stat-label { font-size: 12px; opacity: .5; margin-top: 2px; }
.ring-divider { width: 1px; height: 34px; background: rgba(255,255,255,.12); }

/* ── Stat grid ── */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.stat-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) both;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  pointer-events: none;
  z-index: 0;
}

.todo-card    { animation-delay: .05s; border-color: rgba(100,160,255,.3); }
.doing-card   { animation-delay: .10s; border-color: rgba(255,200,80,.3); }
.overdue-card { animation-delay: .15s; border-color: rgba(255,80,80,.3); }
.project-card { animation-delay: .20s; border-color: rgba(0,210,140,.3); }

.todo-card::before    { background: radial-gradient(200px 130px at 0% 0%, rgba(100,160,255,.13), transparent 65%); }
.doing-card::before   { background: radial-gradient(200px 130px at 0% 0%, rgba(255,200,80,.13), transparent 65%); }
.overdue-card::before { background: radial-gradient(200px 130px at 0% 0%, rgba(255,80,80,.13), transparent 65%); }
.project-card::before { background: radial-gradient(200px 130px at 0% 0%, rgba(0,210,140,.13), transparent 65%); }

.stat-icon { font-size: 22px; position: relative; z-index: 1; }

.stat-val {
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.stat-total { font-size: 20px; font-weight: 600; opacity: .45; }

.stat-name {
  font-size: 13px;
  font-weight: 700;
  opacity: .6;
  position: relative;
  z-index: 1;
}

/* ── Bottom grid ── */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.bottom-card {
  padding: 18px 20px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) .25s both;
}

.card-title { font-weight: 800; font-size: 15px; margin-bottom: 14px; }

/* Bar chart */
.bar-list { display: grid; gap: 10px; }

.bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 32px;
  gap: 10px;
  align-items: center;
}

.bar-date { font-size: 12px; opacity: .55; }

.bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  transition: width .9s cubic-bezier(.4,0,.2,1);
}

.bar-val { text-align: right; font-weight: 700; font-size: 13px; }

/* Leaderboard */
.lb-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.lb-list { display: grid; gap: 2px; }

.lb-row {
  display: grid;
  grid-template-columns: 40px 1fr 48px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background .15s;
}

.lb-row:hover { background: rgba(255,255,255,.05); }
.lb-top3 { background: rgba(255,255,255,.03); }

.lb-rank {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb-num { font-size: 13px; font-weight: 700; opacity: .45; }
.lb-name { font-weight: 700; font-size: 14px; }

.lb-count {
  text-align: right;
  font-weight: 900;
  font-size: 16px;
}

/* Loading / error */
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
export class DashboardComponent implements OnInit {
  data: DashboardSummary | null = null;
  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.http.get<DashboardSummary>(`${environment.apiUrl}/api/dashboard/summary`).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) {
          this.auth.logout();
          this.router.navigateByUrl('/login');
          return;
        }
        this.error = `API hata: ${err?.status ?? ''} ${err?.statusText ?? ''}`;
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  get completionPct(): number {
    if (!this.data || this.data.totalTasks === 0) return 0;
    return Math.round((this.data.doneTasks / this.data.totalTasks) * 100);
  }

  get ringOffset(): number {
    const circumference = 2 * Math.PI * 80;
    return circumference - (this.completionPct / 100) * circumference;
  }

  barWidth(value: number): number {
    const max = Math.max(1, ...(this.data?.completedLast7Days?.map(x => x.completed) ?? [1]));
    return Math.min(100, Math.round((value / max) * 100));
  }
}
