import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  assignedUser?: string | null;
  description?: string | null;
  dueDate?: string | null;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
};

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TaskCommentsComponent],
  template: `

<div *ngIf="toast.show"
     style="
      position:fixed;
      top:18px;
      right:18px;
      z-index:99999;
      padding:12px 16px;
      border-radius:14px;
      font-weight:800;
      font-size:14px;
      letter-spacing:.2px;
      color:#fff;
      background:linear-gradient(135deg, rgba(124,58,237,.95), rgba(99,102,241,.95));
      border:1px solid rgba(255,255,255,.18);
      box-shadow:0 14px 40px rgba(0,0,0,.45);
      backdrop-filter:blur(10px);
     ">
  {{ toast.text }}
</div>

<div class="container">
<app-header
  [title]="project?.name || 'Proje'"
  [subtitle]="project?.description || ''">
  <button class="btn" (click)="back()">← Projeler</button>
</app-header> 
  <div *ngIf="error" class="api-error">{{ error }}</div>

  <div *ngIf="canManage" class="card" style="padding:14px;margin-top:16px;">
    <div style="font-weight:900;margin-bottom:10px;">Yeni Görev</div>

    <div class="form-grid">
      <div>
        <div class="muted small" style="margin-bottom:6px;">Başlık</div>
        <input class="input" [(ngModel)]="newTitle" placeholder="Örn: UI düzenle" />
      </div>

      <div>
        <div class="muted small" style="margin-bottom:6px;">Bitiş Tarihi (opsiyonel)</div>
        <input class="input" type="date" [(ngModel)]="newDueDate" />
      </div>

      <div style="grid-column:1 / -1;">
        <div class="muted small" style="margin-bottom:6px;">Açıklama (opsiyonel)</div>
        <textarea class="input" rows="2" [(ngModel)]="newDesc" placeholder="Detay..."></textarea>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
      <button class="btn" type="button" (click)="clearNew()">Temizle</button>
      <button class="btn primary" type="button" [disabled]="creating" (click)="createTask()">
        <span *ngIf="!creating">Task Oluştur</span>
        <span *ngIf="creating">Oluşturuluyor…</span>
      </button>
    </div>

    <div class="muted small" *ngIf="usersError" style="margin-top:10px;">
      {{ usersError }}
    </div>
  </div>

  <div *ngIf="loading" class="muted" style="margin-top:14px;">Yükleniyor…</div>

  <div class="grid" *ngIf="!loading">
    <div class="card task" *ngFor="let t of tasks">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
  <div style="min-width:0;">
    <div class="title">{{ t.title }}</div>
    <div class="muted small" *ngIf="t.description">{{ t.description }}</div>
    <div class="muted small" *ngIf="t.dueDate" style="margin-top:6px;">
      Due: {{ t.dueDate | date:'yyyy-MM-dd' }}
    </div>
  </div>

  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
    <div class="pill" [class.done]="t.status==='Done'">{{ t.status }}</div>

    <button *ngIf="canManage"
            class="btn danger"
            type="button"
            [disabled]="deleting[t.id]"
            (click)="deleteTask(t)">
      {{ deleting[t.id] ? 'Siliniyor…' : 'Sil' }}
    </button>
  </div>
</div>
      <div class="row">
        <div style="display:flex;gap:10px;align-items:center;">
          <span class="muted small">Durum</span>
          <select class="select" [value]="t.status" (change)="changeStatus(t,$event)">
            <option value="Todo">Yapılacak</option>
            <option value="Doing">Yapılıyor</option>
            <option value="Done">Tamamlandı</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span class="muted small">Atamak</span>
          <div class="assignee-chip">
            <ng-container *ngIf="canManage; else readOnlyAssignee">
              <select class="select"
                      [ngModel]="draftAssignee[t.id] ?? (getAssignedId(t) ?? 0)"
                      (ngModelChange)="draftAssignee[t.id] = $event">
                <option [ngValue]="0">Atanmamış</option>
                <option *ngFor="let u of users" [ngValue]="u.id">
                  {{ u.name || u.email || ('User ' + u.id) }}
                </option>
              </select>

              <button class="btn" type="button" (click)="assignApply(t)">
                Ata
              </button>
            </ng-container>

            <ng-template #readOnlyAssignee>
              <span>{{ t.assignedUserName || 'Atanmamış' }}</span>
            </ng-template>
          </div>
        </div>
      </div>
<app-task-comments [taskId]="t.id" [users]="users"></app-task-comments>
    </div>
  </div>

  <div *ngIf="!loading && tasks.length===0" class="muted" style="margin-top:16px;">
    Bu projede task yok.
  </div>

</div>
`,
  styles: [`


.task{
  padding:16px;
  display:flex;
  flex-direction:column;
  gap:12px;
  transition:.15s;
  overflow:hidden;
}
.task:hover{ transform:translateY(-3px); }


.title{
  font-weight:900;
  font-size:16px;
}

.row{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:14px;
  align-items:center;
}
@media (max-width: 520px){
  .row{ grid-template-columns: 1fr; }
}


.pill{
  padding:6px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.08);
  font-size:12px;
  font-weight:800;
}
.pill.done{ background:rgba(120,255,160,.18); }

.select{
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  color: var(--text);

  color-scheme: dark;
  appearance: none;
  -webkit-appearance: none;
}
.select option{
  background:#0f1420;
  color:#fff;
}

.input{
  width:100%;
  padding:10px 12px;
  border-radius:12px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  color:var(--text);
  outline:none;
}
.input:focus{
  background:rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.22);
}

.form-grid{
  display:grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
}
@media (max-width: 720px){
  .form-grid{ grid-template-columns: 1fr; }
}

.assignee-chip{
  display:flex;
  gap:8px;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.10);
  width:100%;             
  justify-content:space-between;
}
.assignee-chip .select{
  min-width: 0;         
  width: 100%;        
}

.api-error{
  margin-top:10px;
  color:#ff7b90;


  .btn.danger{
  border-color: rgba(255,92,122,.45);
  background: rgba(255,92,122,.12);
}
.btn.danger:hover{
  background: rgba(255,92,122,.18);
}
.btn.danger:disabled{
  opacity:.55;
  cursor:not-allowed;
}
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
  usersError = '';
  draftAssignee: Record<number, number> = {};

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const role = this.getRoleFromToken();
    this.canManage = role === 'Admin' || role === 'Lead';
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiUrl}/api/Projects/${id}`).subscribe({
      next: (p) => { this.project = p; this.cd.detectChanges(); },
      error: (err) => this.handleErr(err)
    });

    this.reloadTasks(id);

    // Users (Lead/Admin)
    // Users (Herkes) -> comment userId -> name çözmek için
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

  private reloadTasks(projectId: number) {
    this.http.get<any[]>(`${environment.apiUrl}/api/Tasks/project/${projectId}`).subscribe({
      next: (t) => {
        this.tasks = (t ?? []).map(x => ({
          id: x.id ?? x.Id,
          title: x.title ?? x.Title,
          status: x.status ?? x.Status,
          assignedUser: x.assignedUser ?? x.AssignedUser ?? null,
          description: x.description ?? x.Description ?? null,
          dueDate: x.dueDate ?? x.DueDate ?? null,
          assignedUserId: x.assignedUserId ?? x.AssignedUserId ?? null,
          assignedUserName: x.assignedUserName ?? null
        }));
        this.tasks.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleErr(err);
      }
    });
  }

  createTask(): void {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.error = '';

    if (!this.newTitle.trim()) {
      this.error = 'Başlık zorunlu.';
      this.cd.detectChanges();
      return;
    }

    this.creating = true;

    const payload = {
      title: this.newTitle.trim(),
      description: this.newDesc?.trim() || null,
      projectId,
      dueDate: this.newDueDate ? (this.newDueDate + 'T00:00:00') : null
    };

    this.http.post<any>(`${environment.apiUrl}/api/Tasks`, payload)
      .pipe(finalize(() => {
        this.creating = false;
        this.cd.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          const vm: TaskVm = {
            id: res?.id ?? res?.Id ?? 0,
            title: res?.title ?? res?.Title ?? payload.title,
            status: res?.status ?? res?.Status ?? 'Todo',
            assignedUser: res?.assignedUser ?? res?.AssignedUser ?? null,
            description: res?.description ?? res?.Description ?? payload.description,
            dueDate: res?.dueDate ?? res?.DueDate ?? payload.dueDate,
            assignedUserId: res?.assignedUserId ?? res?.AssignedUserId ?? null
          };

          if (vm.id) {
            this.tasks = [vm, ...this.tasks];
          }

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
  }

  changeStatus(task: TaskVm, e: any): void {
    const status = String(e.target.value);
    this.error = '';

    this.http.put(`${environment.apiUrl}/api/Tasks/${task.id}/status`, { status }).subscribe({
      next: () => {
        task.status = status;
        this.cd.detectChanges();
      },

      error: (err) => this.handleErr(err)
    });
  }

  getAssignedId(t: TaskVm): number | null {
    if (typeof t.assignedUserId === 'number') return t.assignedUserId;
    return null;
  }

  assignApply(task: TaskVm): void {
    const userId = Number(this.draftAssignee[task.id] ?? (this.getAssignedId(task) ?? 0));
    this.error = '';

    this.http.put(`${environment.apiUrl}/api/Tasks/${task.id}/assign/${userId}`, null)
      .subscribe({
        next: () => {
          const u = this.users.find(x => x.id === userId);

          task.assignedUserId = userId === 0 ? null : userId;
          task.assignedUser = userId === 0
            ? null
            : (u?.name || u?.email || ('User ' + userId));

          this.showToast(
            userId === 0
              ? "Atama kaldırıldı"
              : `${task.title} görevi ${task.assignedUser} kullanıcısına atandı`
          );

          this.cd.detectChanges();
        },

        error: (err) => this.handleErr(err)
      });
  }

  displayAssignee(task: TaskVm): string {
    if (task.assignedUser) return task.assignedUser;

    const uid = this.getAssignedId(task);
    if (uid) {
      const u = this.users.find(x => x.id === uid);
      return u ? (u.name || u.email || ('User ' + uid)) : ('User ' + uid);
    }
    return 'Unassigned';
  }

  private handleErr(err: any): void {
    if (!err || err.status == null) return;

    if (err.status === 401) {
      this.auth.logout();
      this.router.navigateByUrl('/login');
      return;
    }
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
    return (
      payload?.role ||
      payload?.Role ||
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      ''
    );
  }

  private parseJwt(token: string): any {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  goDashboard(): void {
    this.router.navigateByUrl('/');
  }

  back(): void {
    this.router.navigateByUrl('/projects');
  }
  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  toast = { show: false, text: '' };

  showToast(msg: string) {
    this.toast.text = msg;
    this.toast.show = true;
    this.cd.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cd.detectChanges();
    }, 2000);
  }

  deleting: Record<number, boolean> = {};
  deleteTask(t: any): void {
    if (!this.canManage) return;
    const ok = confirm(`"${t.title}" görevini silmek istiyor musun?`);
    if (!ok) return;
    this.error = '';
    this.deleting[t.id] = true;
    this.http.delete(`${environment.apiUrl}/api/Tasks/${t.id}`)
      .pipe(finalize(() => {
        delete this.deleting[t.id];
        this.cd.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.tasks = this.tasks.filter(x => x.id !== t.id);
          const projectId = Number(this.route.snapshot.paramMap.get('id'));
          this.reloadTasks(projectId);
        },
        error: (err) => this.handleErr(err)
      });
  }
}
