import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { finalize } from 'rxjs/operators';

type UserItem = { id: number; name?: string | null; email?: string | null };

type TaskComment = {
    id: number;
    taskId: number;
    userId: number;
    text?: string | null;
    content?: string | null;
    createdAt: string;
    userName?: string | null;
};

@Component({
    selector: 'app-task-comments',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
  <div class="commentBox">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-weight:900;">Yorumlar</div>
      <button class="btn" type="button" (click)="fetch()" [disabled]="loading">Yenile</button>
    </div>

    <p *ngIf="loading" class="muted" style="margin:6px 0 0 0;">Yükleniyor…</p>
    <p *ngIf="error" style="color:#ff7b90;margin:6px 0 0 0;">{{ error }}</p>

    <div *ngIf="!loading && comments.length===0" class="muted" style="margin-top:8px;">
      Henüz yorum yok.
    </div>

    <div *ngIf="!loading && comments.length" style="display:grid;gap:10px;margin-top:10px;">
      <div class="comment" *ngFor="let c of comments">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;">
            <span style="font-weight:800;">
              {{ displayUserName(c) }}
            </span>
            <span class="muted small">{{ c.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
          </div>

          <ng-container *ngIf="canDelete(c)">
            <ng-container *ngIf="confirmingDeleteId !== c.id">
              <button type="button" class="btn danger"
                      (click)="confirmingDeleteId = c.id"
                      [disabled]="deleting[c.id]">Sil</button>
            </ng-container>
            <ng-container *ngIf="confirmingDeleteId === c.id">
              <button type="button" class="btn danger" (click)="remove(c)">Evet</button>
              <button type="button" class="btn" (click)="confirmingDeleteId = null">Vazgeç</button>
            </ng-container>
          </ng-container>
        </div>

        <div style="margin-top:6px;white-space:pre-wrap;">
          {{ c.text || c.content || '' }}
        </div>
      </div>
    </div>

    <div style="display:grid;gap:8px;margin-top:10px;">
      <textarea class="ta"
                rows="3"
                [(ngModel)]="newContent"
                placeholder="Yorum yaz..."></textarea>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span class="muted small">{{ (newContent.length || 0) }}/500</span>

        <button class="btn primary"
                type="button"
                (click)="add()"
                [disabled]="saving || !newContent || !newContent.trim() || newContent.length>500">
          {{ saving ? 'Gönderiliyor…' : 'Gönder' }}
        </button>
      </div>
    </div>
  </div>
  `,
    styles: [`
    .commentBox{
      margin-top:12px;
      border-top:1px solid rgba(255,255,255,.10);
      padding-top:12px;
      display:grid;
      gap:10px;
    }
    .comment{
      border:1px solid rgba(255,255,255,.10);
      border-radius:12px;
      padding:10px;
      background: rgba(0,0,0,.10);
    }
    .ta{
      width:100%;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.12);
      padding:10px;
      background: rgba(255,255,255,.06);
      color:var(--text);
      outline:none;
      resize: vertical;
    }
    .ta:focus{ border-color: rgba(255,255,255,.22); }

    .btn.danger{
      border-color: rgba(255,92,122,.45);
      background: rgba(255,92,122,.12);
    }
    .btn.danger:hover{ background: rgba(255,92,122,.18); }
    .btn.danger:disabled{ opacity:.55; cursor:not-allowed; }
  `]
})
export class TaskCommentsComponent implements OnChanges {
    @Input({ required: true }) taskId!: number;

    // ✅ ProjectDetail’den geçeceğiz: [users]="users"
    @Input() users: UserItem[] = [];

    comments: TaskComment[] = [];
    loading = false;
    saving = false;
    error = '';
    newContent = '';
    deleting: Record<number, boolean> = {};
    confirmingDeleteId: number | null = null;

    constructor(
        private http: HttpClient,
        private auth: AuthService,
        private cd: ChangeDetectorRef
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['taskId'] && this.taskId) this.fetch();
    }

    displayUserName(c: TaskComment): string {
        const direct = (c.userName || '').trim();
        if (direct) return direct;

        const u = this.users?.find(x => x.id === c.userId);
        return (u?.name || u?.email || ('User #' + c.userId));
    }

    fetch(): void {
        this.loading = true;
        this.error = '';

        this.http.get<any>(`${environment.apiUrl}/api/tasks/${this.taskId}/comments`)
            .pipe(finalize(() => {
                this.loading = false;
                this.cd.detectChanges();
            }))
            .subscribe({
                next: (res: any) => {
                    const arr = Array.isArray(res) ? res : [];

                    this.comments = arr.map(x => ({
                        id: x.id ?? x.Id,
                        taskId: x.taskId ?? x.TaskId,
                        userId: x.userId ?? x.UserId,
                        userName: x.userName ?? x.UserName ?? null,
                        text: x.text ?? x.Text ?? x.content ?? x.Content ?? '',
                        createdAt: x.createdAt ?? x.CreatedAt
                    }));

                    this.cd.detectChanges();
                },
                error: (err) => {
                    if (err?.status === 401) { this.auth.logout(); return; }

                    let detail = '';
                    if (typeof err?.error === 'string') detail = err.error;
                    else if (err?.error?.errors) {
                        const lines: string[] = [];
                        for (const k of Object.keys(err.error.errors)) {
                            const msgs = err.error.errors[k];
                            if (Array.isArray(msgs)) lines.push(`${k}: ${msgs.join(', ')}`);
                        }
                        detail = lines.join(' | ');
                    } else detail = err?.error?.message || err?.error?.title || '';

                    this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
                    console.error(err);
                    this.cd.detectChanges();
                }
            });
    }

    canDelete(c: TaskComment): boolean {
        if (this.auth.hasAnyRole('Admin', 'Lead')) return true;
        const myId = this.auth.getUserId() ?? 0;
        return c.userId === myId;
    }

    add(): void {
        const text = (this.newContent || '').trim();
        if (!text || text.length > 500) return;

        this.saving = true;
        this.error = '';

        // Swagger request body: { "text": "..." }
        this.http.post<any>(`${environment.apiUrl}/api/tasks/${this.taskId}/comments`, { text })
            .pipe(finalize(() => {
                this.saving = false;
                this.cd.detectChanges();
            }))
            .subscribe({
                next: () => {
                    // ✅ append yerine fetch: response alan adı/case farkı derdi bitiyor
                    this.newContent = '';
                    this.fetch();
                },
                error: (err) => {
                    if (err?.status === 401) { this.auth.logout(); return; }

                    let detail = '';
                    if (typeof err?.error === 'string') detail = err.error;
                    else if (err?.error?.errors) {
                        const lines: string[] = [];
                        for (const k of Object.keys(err.error.errors)) {
                            const msgs = err.error.errors[k];
                            if (Array.isArray(msgs)) lines.push(`${k}: ${msgs.join(', ')}`);
                        }
                        detail = lines.join(' | ');
                    } else detail = err?.error?.message || err?.error?.title || '';

                    this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
                    console.error(err);
                    this.cd.detectChanges();
                }
            });
    }

    remove(c: TaskComment): void {
        if (!this.canDelete(c)) { this.error = 'Bu işlem için yetkin yok.'; return; }
        this.confirmingDeleteId = null;
        this.error = '';
        this.deleting[c.id] = true;
        this.cd.detectChanges();

        this.http.delete(`${environment.apiUrl}/api/tasks/${this.taskId}/comments/${c.id}`, { responseType: 'text' })
            .pipe(finalize(() => {
                delete this.deleting[c.id];
                this.cd.detectChanges();
            }))
            .subscribe({
                next: () => {
                    this.comments = this.comments.filter(x => x.id !== c.id);
                    this.cd.detectChanges();
                },
                error: (err) => {
                    if (err?.status === 401) { this.auth.logout(); return; }

                    let detail = '';
                    if (typeof err?.error === 'string') detail = err.error;
                    else if (err?.error?.errors) {
                        const lines: string[] = [];
                        for (const k of Object.keys(err.error.errors)) {
                            const msgs = err.error.errors[k];
                            if (Array.isArray(msgs)) lines.push(`${k}: ${msgs.join(', ')}`);
                        }
                        detail = lines.join(' | ');
                    } else detail = err?.error?.message || err?.error?.title || '';

                    this.error = `API hata: ${err?.status ?? ''} ${detail || (err?.statusText ?? '')}`.trim();
                    console.error(err);
                    this.cd.detectChanges();
                }
            });
    }
}