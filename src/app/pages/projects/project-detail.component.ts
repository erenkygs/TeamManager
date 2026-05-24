import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { finalize } from 'rxjs/operators';
import { HeaderComponent } from '../../layout/header.component';
import { TaskCommentsComponent } from './task-comments';

type UserItem = { id: number; name?: string | null; email?: string | null; role?: string | null };

type TaskVm = {
  id: number;
  title: string;
  status: 'Todo' | 'Doing' | 'Done' | string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedUser?: string | null;
  description?: string | null;
  dueDate?: string | null;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
};

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [FormsModule, HeaderComponent, TaskCommentsComponent],
  template: `
<!-- Toast -->
@if (toast.show) {
  <div class="toast">{{ toast.text }}</div>
}

<div class="container">
  <app-header
    [title]="project?.name || 'Proje'"
    [subtitle]="project?.description || ''">
    <button class="back-btn" (click)="back()">← Projeler</button>
  </app-header>

  @if (error) { <div class="err-box">{{ error }}</div> }

  <!-- Yeni görev formu -->
  @if (canManage) {
    <div class="card new-task-card">
      <div class="section-title">Yeni Görev</div>

      <div class="form-grid">
        <div class="field">
          <label>Başlık</label>
          <input class="input" [(ngModel)]="newTitle" placeholder="Örn: UI düzenle" />
        </div>

        <div class="field">
          <label>Bitiş Tarihi <span class="opt">(opsiyonel)</span></label>
          <input class="input date-input" type="date" [(ngModel)]="newDueDate" />
        </div>

        <div class="field">
          <label>Öncelik</label>
          <select class="input select" [(ngModel)]="newPriority">
            <option value="Low">Düşük</option>
            <option value="Medium">Orta</option>
            <option value="High">Yüksek</option>
            <option value="Critical">Kritik</option>
          </select>
        </div>

        <div class="field desc-field">
          <label>Açıklama <span class="opt">(opsiyonel)</span></label>
          <textarea class="input" rows="2" [(ngModel)]="newDesc" placeholder="Detay…"></textarea>
        </div>
      </div>

      <div class="form-actions">
        <button class="action-btn cancel-btn" type="button" (click)="clearNew()">Temizle</button>
        <button class="action-btn save-btn" type="button"
                [disabled]="creating || !newTitle.trim()" (click)="createTask()">
          @if (!creating) { <span>Task Oluştur</span> }
          @if (creating)  { <span>Oluşturuluyor…</span> }
        </button>
      </div>

      @if (usersError) { <div class="muted small" style="margin-top:8px;">{{ usersError }}</div> }
    </div>
  }

  @if (loading) { <div class="loading-row"><div class="spinner"></div> Yükleniyor…</div> }

  @if (!loading && tasks.length === 0) {
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">Bu projede görev yok</div>
    </div>
  }

  <!-- Görev listesi -->
  @if (!loading && tasks.length) {
    <div class="task-list">
      @for (t of tasks; track t.id; let i = $index) {
        <div class="card task-card" [class]="'p-' + priorityClass(t.priority)"
             [style.animation-delay]="(i * 0.04) + 's'">

          <!-- Görev başlığı + sağ aksiyonlar -->
          <div class="task-header">
            <div class="task-left">
              <div class="task-title">{{ t.title }}</div>
              @if (t.description) {
                <div class="muted small task-desc">{{ t.description }}</div>
              }
              @if (t.dueDate) {
                <div class="due-date" [class.overdue]="isOverdue(t.dueDate, t.status)">
                  📅 {{ fmtDate(t.dueDate) }}
                </div>
              }
            </div>

            <div class="task-badges">
              <div class="priority-badge" [class]="priorityClass(t.priority)">
                {{ priorityLabel(t.priority) }}
              </div>
              <div class="status-pill" [class]="statusCls(t.status)">
                {{ statusLabel(t.status) }}
              </div>
              @if (canManage) {
                <button class="del-btn"
                        type="button"
                        [disabled]="deleting[t.id]"
                        (click)="deleteTask(t)">
                  {{ deleting[t.id] ? '…' : 'Sil' }}
                </button>
              }
            </div>
          </div>

          <!-- Durum + atama -->
          <div class="task-controls">
            <div class="control-group">
              <span class="ctrl-label">Durum</span>
              <select class="ctrl-select" [value]="t.status" (change)="changeStatus(t, $event)">
                <option value="Todo">Yapılacak</option>
                <option value="Doing">Yapılıyor</option>
                <option value="Done">Tamamlandı</option>
              </select>
            </div>

            <div class="control-group">
              <span class="ctrl-label">Kişi</span>
              @if (canManage) {
                <div class="assign-wrap">
                  <select class="ctrl-select"
                          [ngModel]="draftAssignee[t.id] || (getAssignedId(t) || 0)"
                          (ngModelChange)="draftAssignee[t.id] = $event">
                    <option [ngValue]="0">Atanmamış</option>
                    @for (u of users; track u.id) {
                      <option [ngValue]="u.id">{{ u.name || u.email || ('User ' + u.id) }}</option>
                    }
                  </select>
                  <button class="assign-btn" type="button" (click)="assignApply(t)">Ata</button>
                </div>
              } @else {
                <span class="assign-readonly">{{ t.assignedUserName || 'Atanmamış' }}</span>
              }
            </div>
          </div>

          <app-task-comments [taskId]="t.id" [users]="users"></app-task-comments>
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

/* ── Toast ── */
.toast {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 99999;
  padding: 12px 18px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 14px;
  color: #fff;
  background: linear-gradient(135deg, rgba(124,58,237,.95), rgba(99,102,241,.95));
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 14px 40px rgba(0,0,0,.45);
  backdrop-filter: blur(10px);
  animation: card-in .25s ease;
}

/* ── Back button ── */
.back-btn {
  padding: 9px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: var(--text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s, transform .12s;
}
.back-btn:hover { background: rgba(255,255,255,.11); transform: translateX(-2px); }

/* ── New task card ── */
.new-task-card {
  padding: 22px 24px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
  animation: card-in .38s cubic-bezier(.22,.68,0,1.2);
}

.new-task-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(500px 200px at 0% 0%, rgba(31,111,255,.14), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 900;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

/* ── Form grid ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 180px 160px;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.desc-field { grid-column: 1 / -1; }

@media (max-width: 860px) { .form-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .form-grid { grid-template-columns: 1fr; } }

.field { display: grid; gap: 6px; }

label {
  font-size: 12px;
  font-weight: 700;
  opacity: .75;
}

.opt { font-weight: 400; opacity: .55; }

.input {
  width: 100%;
  padding: 10px 13px;
  border-radius: 11px;
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
  border-color: rgba(31,111,255,.5);
  box-shadow: 0 0 0 3px rgba(31,111,255,.10);
}

.date-input { color-scheme: dark; }

textarea.input { resize: vertical; min-height: 68px; }

.select {
  cursor: pointer;
  color-scheme: dark;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,.45)' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.select option { background: #0f1420; }

/* ── Form actions ── */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  position: relative;
  z-index: 1;
}

.action-btn {
  padding: 10px 22px;
  border-radius: 11px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: transform .13s, box-shadow .15s, background .15s;
}
.action-btn:hover    { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.25); }
.action-btn:active   { transform: translateY(0); box-shadow: none; }
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
  min-width: 130px;
}

/* ── Task list ── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Task card ── */
.task-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
  animation: card-in .38s cubic-bezier(.22,.68,0,1.2) both;
  border-left-width: 3px;
  transition: transform .15s ease, box-shadow .15s ease;
}
.task-card:hover { transform: translateX(3px); box-shadow: 0 8px 28px rgba(0,0,0,.22); }

/* Priority border colors */
.task-card.p-low      { border-left-color: rgba(120,200,120,.6); }
.task-card.p-medium   { border-left-color: rgba(100,160,255,.6); }
.task-card.p-high     { border-left-color: rgba(255,180,80,.6); }
.task-card.p-critical { border-left-color: rgba(255,80,80,.6); }

/* ── Task header ── */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.task-left { flex: 1; min-width: 0; }

.task-title {
  font-weight: 900;
  font-size: 16px;
  line-height: 1.3;
}

.task-desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.due-date {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  opacity: .65;
}
.due-date.overdue { color: #ff8099; opacity: 1; }

.task-badges {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ── Priority badge ── */
.priority-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid transparent;
  white-space: nowrap;
}
.priority-badge.low      { background: rgba(120,200,120,.14); color: #8ee28e; border-color: rgba(120,200,120,.24); }
.priority-badge.medium   { background: rgba(100,160,255,.12); color: #80b4ff; border-color: rgba(100,160,255,.22); }
.priority-badge.high     { background: rgba(255,180,80,.14);  color: #ffbf66; border-color: rgba(255,180,80,.24); }
.priority-badge.critical { background: rgba(255,92,122,.14);  color: #ff8099; border-color: rgba(255,92,122,.24); }

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

/* ── Delete button ── */
.del-btn {
  padding: 5px 12px;
  border-radius: 9px;
  border: 1px solid rgba(255,92,122,.32);
  background: rgba(255,92,122,.08);
  color: #ff8099;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: background .15s, transform .12s;
}
.del-btn:hover    { background: rgba(255,92,122,.18); transform: translateY(-1px); }
.del-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

/* ── Task controls ── */
.task-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: center;
}
@media (max-width: 560px) { .task-controls { grid-template-columns: 1fr; } }

.control-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ctrl-label {
  font-size: 12px;
  font-weight: 700;
  opacity: .5;
  white-space: nowrap;
}

.ctrl-select {
  flex: 1;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: var(--text);
  color-scheme: dark;
  appearance: none;
  -webkit-appearance: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
.ctrl-select option { background: #0f1420; }

.assign-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.assign-btn {
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid rgba(120,90,255,.3);
  background: rgba(120,90,255,.10);
  color: #b0a0ff;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s;
}
.assign-btn:hover { background: rgba(120,90,255,.20); }

.assign-readonly {
  font-size: 13px;
  font-weight: 700;
  opacity: .75;
}

/* ── Empty / loading / error ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
}
.empty-icon  { font-size: 44px; opacity: .45; }
.empty-title { font-size: 17px; font-weight: 800; opacity: .7; }

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
export class ProjectDetailComponent implements OnInit {
  project: any = null;
  tasks: TaskVm[] = [];
  users: UserItem[] = [];
  loading = true;
  error = '';
  canManage = false;

  creating = false;
  newTitle = '';
  newDesc = '';
  newDueDate = '';
  newPriority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';

  usersError = '';
  draftAssignee: Record<number, number> = {};
  toast = { show: false, text: '' };
  deleting: Record<number, boolean> = {};

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.canManage = ['Admin', 'Lead'].includes(this.getRoleFromToken());
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiUrl}/api/Projects/${id}`).subscribe({
      next: (p) => { this.project = p; this.cd.detectChanges(); },
      error: (err) => this.handleErr(err)
    });

    this.reloadTasks(id);

    this.http.get<any[]>(`${environment.apiUrl}/api/users`).subscribe({
      next: (u) => {
        this.users = (u ?? []).map(x => ({
          id: x.id ?? x.Id,
          name: x.name ?? x.Name ?? null,
          email: x.email ?? x.Email ?? null,
          role: x.role ?? x.Role ?? null
        }));
        this.cd.detectChanges();
      },
      error: (err) => {
        this.usersError = `Kullanıcı listesi alınamadı (${err?.status ?? ''}).`;
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  private reloadTasks(projectId: number): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/Tasks/project/${projectId}`).subscribe({
      next: (t) => {
        this.tasks = (t ?? []).map(x => ({
          id: x.id ?? x.Id,
          title: x.title ?? x.Title,
          status: x.status ?? x.Status,
          priority: x.priority ?? x.Priority ?? 'Medium',
          assignedUser: x.assignedUser ?? x.AssignedUser ?? null,
          description: x.description ?? x.Description ?? null,
          dueDate: x.dueDate ?? x.DueDate ?? null,
          assignedUserId: x.assignedUserId ?? x.AssignedUserId ?? null,
          assignedUserName: x.assignedUserName ?? x.AssignedUserName ?? null
        }));
        this.tasks.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => { this.loading = false; this.handleErr(err); }
    });
  }

  createTask(): void {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.error = '';
    if (!this.newTitle.trim()) { this.error = 'Başlık zorunlu.'; this.cd.detectChanges(); return; }

    this.creating = true;
    const payload = {
      title: this.newTitle.trim(),
      description: this.newDesc?.trim() || null,
      projectId,
      dueDate: this.newDueDate ? (this.newDueDate + 'T00:00:00') : null,
      priority: this.newPriority
    };

    this.http.post<any>(`${environment.apiUrl}/api/Tasks`, payload)
      .pipe(finalize(() => { this.creating = false; this.cd.detectChanges(); }))
      .subscribe({
        next: (res) => {
          const vm: TaskVm = {
            id: res?.id ?? res?.Id ?? 0,
            title: res?.title ?? res?.Title ?? payload.title,
            status: res?.status ?? res?.Status ?? 'Todo',
            priority: res?.priority ?? res?.Priority ?? payload.priority ?? 'Medium',
            assignedUser: res?.assignedUser ?? res?.AssignedUser ?? null,
            description: res?.description ?? res?.Description ?? payload.description,
            dueDate: res?.dueDate ?? res?.DueDate ?? payload.dueDate,
            assignedUserId: res?.assignedUserId ?? res?.AssignedUserId ?? null,
            assignedUserName: res?.assignedUserName ?? res?.AssignedUserName ?? null
          };
          if (vm.id) this.tasks = [vm, ...this.tasks];
          this.clearNew();
          this.showToast('Görev oluşturuldu');
          this.reloadTasks(projectId);
        },
        error: (err) => this.handleErr(err)
      });
  }

  clearNew(): void {
    this.newTitle = '';
    this.newDesc = '';
    this.newDueDate = '';
    this.newPriority = 'Medium';
  }

  changeStatus(task: TaskVm, e: any): void {
    const status = String(e.target.value);
    this.error = '';
    this.http.put(`${environment.apiUrl}/api/Tasks/${task.id}/status`, { status }).subscribe({
      next: () => { task.status = status; this.cd.detectChanges(); },
      error: (err) => this.handleErr(err)
    });
  }

  getAssignedId(t: TaskVm): number | null {
    return typeof t.assignedUserId === 'number' ? t.assignedUserId : null;
  }

  assignApply(task: TaskVm): void {
    const userId = Number(this.draftAssignee[task.id] ?? (this.getAssignedId(task) ?? 0));
    this.error = '';

    this.http.put(`${environment.apiUrl}/api/Tasks/${task.id}/assign/${userId}`, null).subscribe({
      next: () => {
        const u = this.users.find(x => x.id === userId);
        task.assignedUserId  = userId === 0 ? null : userId;
        task.assignedUser    = userId === 0 ? null : (u?.name || u?.email || ('User ' + userId));
        task.assignedUserName = task.assignedUser;
        this.showToast(userId === 0 ? 'Atama kaldırıldı' : `${task.title} → ${task.assignedUserName}`);
        this.cd.detectChanges();
      },
      error: (err) => this.handleErr(err)
    });
  }

  deleteTask(t: TaskVm): void {
    if (!this.canManage) return;
    if (!confirm(`"${t.title}" görevini silmek istiyor musun?`)) return;

    this.error = '';
    this.deleting[t.id] = true;

    this.http.delete(`${environment.apiUrl}/api/Tasks/${t.id}`)
      .pipe(finalize(() => { delete this.deleting[t.id]; this.cd.detectChanges(); }))
      .subscribe({
        next: () => {
          this.tasks = this.tasks.filter(x => x.id !== t.id);
          this.reloadTasks(Number(this.route.snapshot.paramMap.get('id')));
        },
        error: (err) => this.handleErr(err)
      });
  }

  priorityClass(priority?: string): string {
    switch (priority) {
      case 'Low':      return 'low';
      case 'High':     return 'high';
      case 'Critical': return 'critical';
      default:         return 'medium';
    }
  }

  priorityLabel(priority?: string): string {
    switch (priority) {
      case 'Low':      return 'Düşük';
      case 'High':     return 'Yüksek';
      case 'Critical': return 'Kritik';
      default:         return 'Orta';
    }
  }

  statusCls(status: string): string {
    if (status === 'Done')  return 's-done';
    if (status === 'Doing') return 's-doing';
    return 's-todo';
  }

  statusLabel(status: string): string {
    if (status === 'Done')  return 'Tamamlandı';
    if (status === 'Doing') return 'Yapılıyor';
    return 'Yapılacak';
  }

  isOverdue(dueDate: string | null | undefined, status: string): boolean {
    if (!dueDate || status === 'Done') return false;
    return new Date(dueDate) < new Date();
  }

  fmtDate(str: string | null | undefined): string {
    if (!str) return '';
    try {
      const d = new Date(str);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    } catch { return str ?? ''; }
  }

  showToast(msg: string): void {
    this.toast.text = msg;
    this.toast.show = true;
    this.cd.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cd.detectChanges(); }, 2200);
  }

  back(): void { this.router.navigateByUrl('/projects'); }

  private handleErr(err: any): void {
    if (!err || err.status == null) return;
    if (err.status === 401) { this.auth.logout(); this.router.navigateByUrl('/login'); return; }

    let detail = '';
    if (typeof err?.error === 'string') {
      detail = err.error;
    } else if (err?.error?.errors) {
      const lines: string[] = [];
      for (const k of Object.keys(err.error.errors)) {
        const msgs = err.error.errors[k];
        if (Array.isArray(msgs)) lines.push(`${k}: ${msgs.join(', ')}`);
      }
      detail = lines.join(' | ') || (err?.error?.title ?? '');
    } else {
      detail = err?.error?.message || err?.error?.title || '';
    }

    this.error = `API hata: ${err.status} ${detail || (err.statusText ?? '')}`.trim();
    console.error(err);
    this.cd.detectChanges();
  }

  private getRoleFromToken(): string {
    const token = localStorage.getItem('tm_token') || '';
    const payload = this.parseJwt(token);
    return payload?.role || payload?.Role ||
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
  }

  private parseJwt(token: string): any {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
  }
}
