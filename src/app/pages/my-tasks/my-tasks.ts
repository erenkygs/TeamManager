import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type MyTask = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: number;
  projectName: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

type FilterStatus = 'all' | 'Todo' | 'Doing' | 'Done';
type FilterPriority = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Görevlerim" subtitle="Sana atanan tüm görevler"></app-header>

  @if (loading) { <div class="loading-row"><div class="spinner"></div> Yükleniyor…</div> }
  @if (error)   { <div class="err-box">{{ error }}</div> }

  @if (!loading && tasks.length === 0 && !error) {
    <div class="empty-state">
      <div class="empty-icon">✅</div>
      <div class="empty-title">Sana atanan görev yok</div>
      <div class="muted">Görevler atandığında burada görünecek.</div>
    </div>
  }

  @if (tasks.length) {
    <!-- Stat kartları -->
    <div class="stats-row">
      <div class="stat-chip todo-chip">
        <span class="chip-val">{{ count('Todo') }}</span>
        <span class="chip-label">Yapılacak</span>
      </div>
      <div class="stat-chip doing-chip">
        <span class="chip-val">{{ count('Doing') }}</span>
        <span class="chip-label">Yapılıyor</span>
      </div>
      <div class="stat-chip done-chip">
        <span class="chip-val">{{ count('Done') }}</span>
        <span class="chip-label">Tamamlandı</span>
      </div>
      @if (overdueCount > 0) {
        <div class="stat-chip overdue-chip">
          <span class="chip-val">{{ overdueCount }}</span>
          <span class="chip-label">Geciken</span>
        </div>
      }
    </div>

    <!-- Filtreler -->
    <div class="filter-bar">
      <div class="tab-group">
        @for (tab of statusTabs; track tab.val) {
          <button class="tab-btn" [class.active]="filterStatus === tab.val"
                  (click)="filterStatus = tab.val; applyFilter()">
            {{ tab.label }}
          </button>
        }
      </div>

      <div class="priority-group">
        @for (p of priorityOpts; track p.val) {
          <button class="prio-btn" [class.active]="filterPriority === p.val"
                  [class]="filterPriority === p.val ? 'prio-btn active prio-' + p.val : 'prio-btn prio-' + p.val"
                  (click)="filterPriority = p.val; applyFilter()">
            {{ p.label }}
          </button>
        }
      </div>
    </div>

    <!-- Sonuç sayısı -->
    <div class="result-count muted small">{{ filtered.length }} görev gösteriliyor</div>

    @if (filtered.length === 0) {
      <div class="empty-state" style="padding:40px 20px;">
        <div class="muted">Bu filtreyle eşleşen görev yok.</div>
      </div>
    }

    <!-- Görev listesi -->
    <div class="task-list">
      @for (t of filtered; track t.id; let i = $index) {
        <div class="card task-card" [class]="'p-' + prioCls(t.priority)"
             [style.animation-delay]="(i * 0.04) + 's'">

          <div class="task-main">
            <div class="task-left">
              <div class="task-title">{{ t.title }}</div>
              @if (t.description) {
                <div class="task-desc muted small">{{ t.description }}</div>
              }
              <div class="task-meta">
                <button class="proj-link" (click)="goProject(t.projectId)">
                  📁 {{ t.projectName }}
                </button>
                @if (t.dueDate) {
                  <span class="due" [class.overdue]="isOverdue(t.dueDate, t.status)">
                    📅 {{ fmtDate(t.dueDate) }}
                    @if (isOverdue(t.dueDate, t.status)) { <span class="overdue-tag">Gecikti</span> }
                  </span>
                }
              </div>
            </div>

            <div class="task-right">
              <div class="priority-badge" [class]="prioCls(t.priority)">
                {{ prioLabel(t.priority) }}
              </div>
              <div class="status-pill" [class]="statusCls(t.status)">
                {{ statusLabel(t.status) }}
              </div>
            </div>
          </div>

          <!-- Durum değiştir -->
          <div class="status-row">
            <span class="ctrl-label">Durumu güncelle</span>
            <div class="status-btns">
              @for (s of statusOpts; track s.val) {
                <button class="status-btn" [class.active]="t.status === s.val"
                        [class]="statusBtnCls(s.val, t.status)"
                        [disabled]="t.status === s.val || changing[t.id]"
                        (click)="changeStatus(t, s.val)">
                  {{ s.label }}
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  }
</div>
`,
  styles: [`
@keyframes card-in {
  from { opacity: 0; transform: translateY(16px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Stat chips ── */
.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  animation: card-in .35s ease;
}

.chip-val   { font-size: 22px; font-weight: 900; }
.chip-label { font-size: 12px; font-weight: 700; opacity: .7; }

.todo-chip    { background: rgba(100,160,255,.10); border-color: rgba(100,160,255,.25); }
.doing-chip   { background: rgba(255,200,80,.10);  border-color: rgba(255,200,80,.25); }
.done-chip    { background: rgba(0,210,140,.10);   border-color: rgba(0,210,140,.25); }
.overdue-chip { background: rgba(255,80,80,.10);   border-color: rgba(255,80,80,.25); }

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
}

.tab-group {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 12px;
}

.tab-btn {
  padding: 7px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
  opacity: .65;
}
.tab-btn:hover  { background: rgba(255,255,255,.08); opacity: 1; }
.tab-btn.active { background: rgba(255,255,255,.12); opacity: 1; font-weight: 800; }

.priority-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.prio-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  opacity: .6;
  transition: opacity .15s, background .15s;
}
.prio-btn:hover { opacity: 1; }
.prio-btn.active { opacity: 1; }

.prio-btn.active.prio-all      { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.22); }
.prio-btn.active.prio-Critical { background: rgba(255,80,80,.15);   border-color: rgba(255,80,80,.35);   color: #ff9999; }
.prio-btn.active.prio-High     { background: rgba(255,180,80,.15);  border-color: rgba(255,180,80,.35);  color: #ffcc66; }
.prio-btn.active.prio-Medium   { background: rgba(100,160,255,.15); border-color: rgba(100,160,255,.35); color: #88bbff; }
.prio-btn.active.prio-Low      { background: rgba(120,200,120,.15); border-color: rgba(120,200,120,.35); color: #99ee99; }

.result-count { margin-bottom: 10px; }

/* ── Task list ── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Task card ── */
.task-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  border-left-width: 3px;
  animation: card-in .38s cubic-bezier(.22,.68,0,1.2) both;
  transition: transform .15s ease, box-shadow .15s ease;
}
.task-card:hover { transform: translateX(3px); box-shadow: 0 8px 28px rgba(0,0,0,.22); }

.task-card.p-low      { border-left-color: rgba(120,200,120,.65); }
.task-card.p-medium   { border-left-color: rgba(100,160,255,.65); }
.task-card.p-high     { border-left-color: rgba(255,180,80,.65); }
.task-card.p-critical { border-left-color: rgba(255,80,80,.65); }

/* ── Task main row ── */
.task-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.task-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

.task-title { font-size: 16px; font-weight: 900; }
.task-desc  { font-size: 13px; line-height: 1.5; }

.task-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 2px;
}

.proj-link {
  background: none;
  border: none;
  color: rgba(100,160,255,.85);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  transition: color .15s;
}
.proj-link:hover { color: rgba(100,160,255,1); }

.due {
  font-size: 12px;
  font-weight: 700;
  opacity: .65;
  display: flex;
  align-items: center;
  gap: 6px;
}
.due.overdue { color: #ff8099; opacity: 1; }

.overdue-tag {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255,80,80,.15);
  border: 1px solid rgba(255,80,80,.3);
  font-size: 10px;
  font-weight: 800;
  color: #ff8099;
}

.task-right {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  flex-shrink: 0;
}

/* ── Priority badge ── */
.priority-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid transparent;
  white-space: nowrap;
}
.priority-badge.p-low      { background: rgba(120,200,120,.14); color: #8ee28e; border-color: rgba(120,200,120,.24); }
.priority-badge.p-medium   { background: rgba(100,160,255,.12); color: #80b4ff; border-color: rgba(100,160,255,.22); }
.priority-badge.p-high     { background: rgba(255,180,80,.14);  color: #ffbf66; border-color: rgba(255,180,80,.24); }
.priority-badge.p-critical { background: rgba(255,80,80,.14);   color: #ff8099; border-color: rgba(255,80,80,.24); }

/* ── Status pill ── */
.status-pill {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid transparent;
  white-space: nowrap;
}
.status-pill.s-todo  { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.14); }
.status-pill.s-doing { background: rgba(255,200,80,.12);  border-color: rgba(255,200,80,.24);  color: #ffd066; }
.status-pill.s-done  { background: rgba(0,210,140,.12);   border-color: rgba(0,210,140,.24);   color: #5fffbf; }

/* ── Status row ── */
.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ctrl-label { font-size: 12px; font-weight: 700; opacity: .45; white-space: nowrap; }

.status-btns { display: flex; gap: 6px; flex-wrap: wrap; }

.status-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  opacity: .6;
  transition: opacity .15s, background .15s, transform .12s;
}
.status-btn:hover:not(:disabled) { opacity: 1; transform: translateY(-1px); }
.status-btn:disabled { cursor: not-allowed; }

.status-btn.sb-active-todo  { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.25); opacity: 1; }
.status-btn.sb-active-doing { background: rgba(255,200,80,.16);  border-color: rgba(255,200,80,.30);  opacity: 1; color: #ffd066; }
.status-btn.sb-active-done  { background: rgba(0,210,140,.14);   border-color: rgba(0,210,140,.28);   opacity: 1; color: #5fffbf; }

/* ── Empty / loading / error ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 70px 20px;
  text-align: center;
}
.empty-icon  { font-size: 52px; opacity: .45; }
.empty-title { font-size: 18px; font-weight: 800; opacity: .8; }

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
export class MyTasksComponent implements OnInit {
  tasks: MyTask[] = [];
  filtered: MyTask[] = [];
  loading = false;
  error = '';
  changing: Record<number, boolean> = {};

  filterStatus: FilterStatus = 'all';
  filterPriority: FilterPriority = 'all';

  readonly statusTabs = [
    { val: 'all'  as FilterStatus, label: 'Tümü'       },
    { val: 'Todo' as FilterStatus, label: 'Yapılacak'  },
    { val: 'Doing'as FilterStatus, label: 'Yapılıyor'  },
    { val: 'Done' as FilterStatus, label: 'Tamamlandı' },
  ];

  readonly priorityOpts = [
    { val: 'all'      as FilterPriority, label: 'Tüm Öncelik' },
    { val: 'Critical' as FilterPriority, label: 'Kritik'      },
    { val: 'High'     as FilterPriority, label: 'Yüksek'      },
    { val: 'Medium'   as FilterPriority, label: 'Orta'        },
    { val: 'Low'      as FilterPriority, label: 'Düşük'       },
  ];

  readonly statusOpts = [
    { val: 'Todo',  label: 'Yapılacak'  },
    { val: 'Doing', label: 'Yapılıyor'  },
    { val: 'Done',  label: 'Tamamlandı' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';

    this.http.get<MyTask[]>(`${environment.apiUrl}/api/Tasks/my`).subscribe({
      next: (res) => {
        this.tasks = res ?? [];
        this.applyFilter();
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

  applyFilter(): void {
    this.filtered = this.tasks.filter(t => {
      const statusOk   = this.filterStatus   === 'all' || t.status   === this.filterStatus;
      const priorityOk = this.filterPriority === 'all' || t.priority === this.filterPriority;
      return statusOk && priorityOk;
    });
    this.cd.detectChanges();
  }

  changeStatus(task: MyTask, newStatus: string): void {
    if (task.status === newStatus || this.changing[task.id]) return;

    this.changing[task.id] = true;
    const old = task.status;
    task.status = newStatus;
    this.applyFilter();

    this.http.put(`${environment.apiUrl}/api/Tasks/${task.id}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          delete this.changing[task.id];
          this.cd.detectChanges();
        },
        error: (err) => {
          task.status = old;
          delete this.changing[task.id];
          if (err?.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }
          this.error = `Durum güncellenemedi: ${err?.status ?? ''}`;
          this.applyFilter();
          this.cd.detectChanges();
        }
      });
  }

  goProject(projectId: number): void {
    this.router.navigateByUrl(`/projects/${projectId}`);
  }

  count(status: string): number {
    return this.tasks.filter(t => t.status === status).length;
  }

  get overdueCount(): number {
    return this.tasks.filter(t => this.isOverdue(t.dueDate, t.status)).length;
  }

  isOverdue(dueDate: string | null | undefined, status: string): boolean {
    if (!dueDate || status === 'Done') return false;
    return new Date(dueDate) < new Date();
  }

  prioCls(p: string): string {
    switch (p) {
      case 'Critical': return 'p-critical';
      case 'High':     return 'p-high';
      case 'Low':      return 'p-low';
      default:         return 'p-medium';
    }
  }

  prioLabel(p: string): string {
    switch (p) {
      case 'Critical': return 'Kritik';
      case 'High':     return 'Yüksek';
      case 'Low':      return 'Düşük';
      default:         return 'Orta';
    }
  }

  statusCls(s: string): string {
    if (s === 'Done')  return 's-done';
    if (s === 'Doing') return 's-doing';
    return 's-todo';
  }

  statusLabel(s: string): string {
    if (s === 'Done')  return 'Tamamlandı';
    if (s === 'Doing') return 'Yapılıyor';
    return 'Yapılacak';
  }

  statusBtnCls(btnVal: string, current: string): string {
    if (btnVal !== current) return 'status-btn';
    if (btnVal === 'Done')  return 'status-btn sb-active-done';
    if (btnVal === 'Doing') return 'status-btn sb-active-doing';
    return 'status-btn sb-active-todo';
  }

  fmtDate(str: string | null | undefined): string {
    if (!str) return '';
    try {
      const d = new Date(str);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    } catch { return str ?? ''; }
  }
}
