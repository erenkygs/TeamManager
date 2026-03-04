import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, HeaderComponent], template: `
<div class="container">
<app-header title="Ana Sayfa" subtitle="Genel özet"></app-header>  
  <p *ngIf="loading" class="muted">Yükleniyor...</p>
  <p *ngIf="error" style="color:#ff7b90">{{ error }}</p>
  <ng-container *ngIf="data as d">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0;">
      <div class="card" style="padding:14px;">
        <div class="muted small">Toplam Görev</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.totalTasks }}</div>
      </div>

      <div class="card" style="padding:14px;">
        <div class="muted small">Yapılacak</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.todoTasks }}</div>
      </div>

      <div class="card" style="padding:14px;">
        <div class="muted small">Devam Eden</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.doingTasks }}</div>
      </div>

      <div class="card" style="padding:14px;">
        <div class="muted small">Tamamlanan</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.doneTasks }}</div>
      </div>

      <div class="card" style="padding:14px;border-color:rgba(255,92,122,.35);">
        <div class="muted small">Geciken</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.overdueTasks }}</div>
      </div>

      <div class="card" style="padding:14px;">
        <div class="muted small">Toplam Proje</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.totalProjects }}</div>
      </div>

      <div class="card" style="padding:14px;">
        <div class="muted small">Aktif Projeler</div>
        <div style="font-size:28px;font-weight:800;margin-top:6px;">{{ d.activeProjects }}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div class="card" style="padding:14px;">
        <div style="font-weight:800;margin-bottom:12px;">Son 7 Gün Tamamlanan</div>

        <div *ngIf="d.completedLast7Days?.length; else noDays" style="display:grid;gap:10px;">
          <div *ngFor="let x of d.completedLast7Days"
               style="display:grid;grid-template-columns:110px 1fr 36px;gap:10px;align-items:center;">
            <div class="muted small">{{ x.date }}</div>
            <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden;">
              <div [style.width.%]="barWidth(x.completed)"
                   style="height:100%;background:linear-gradient(135deg,var(--primary),var(--primary-2));border-radius:999px;"></div>
            </div>
            <div style="text-align:right;font-weight:700;">{{ x.completed }}</div>
          </div>
        </div>
        <ng-template #noDays>
          <div class="muted">Veri yok</div>
        </ng-template>
      </div>
      <div class="card" style="padding:14px;">
        <div style="font-weight:800;margin-bottom:12px;">Liderlik Tablosu (İlk 10)</div>

        <table *ngIf="d.leaderboard?.length; else noLb" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th class="muted small" style="text-align:left;padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.10);">#</th>
              <th class="muted small" style="text-align:left;padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.10);">Kullanıcı</th>
              <th class="muted small" style="text-align:right;padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.10);">Tamamlanan</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of d.leaderboard; let i = index">
              <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.06);">{{ i + 1 }}</td>
              <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.06);">
                <div style="font-weight:700;">{{ u.name || u.email || ('User ' + u.userId) }}</div>
                <div class="muted small" *ngIf="u.email">{{ u.email }}</div>
              </td>
              <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right;font-weight:800;">
                {{ u.completed }}
              </td>
            </tr>
          </tbody>
        </table>

        <ng-template #noLb>
          <div class="muted">Henüz Liderlik Tablosu verisi yok.</div>
        </ng-template>
      </div>
    </div>
  </ng-container>
</div>
`,
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
  ) { }

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
  barWidth(value: number): number {
    const max = Math.max(10, ...(this.data?.completedLast7Days?.map(x => x.completed) ?? [10]));
    return Math.min(100, Math.round((value / max) * 100));
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }


  goProjects() {
    this.router.navigateByUrl('/projects');
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }
}
