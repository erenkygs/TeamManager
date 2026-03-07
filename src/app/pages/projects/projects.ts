import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, HeaderComponent],
  template: `
<div class="container">
  <app-header title="Projeler" subtitle="Tüm projeler">
  <button *ngIf="canManageProjects" class="btn primary" (click)="addProject()">+ Proje Ekle</button>
</app-header>
  <p *ngIf="loading" class="muted">Yükleniyor...</p>
  <p *ngIf="error" style="color:#ff7b90">{{ error }}</p>

 <div *ngIf="!loading && projects.length === 0" class="empty">
  <div style="font-size:40px;"></div>
  <div class="muted">Henüz proje oluşturulmadı</div>
</div>

  <div *ngIf="projects.length"
       style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:14px;">
    <div class="card" *ngFor="let p of projects" style="padding:16px;display:grid;gap:10px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="font-weight:800;font-size:16px;">{{ p.name }}</div>
      </div>

      <div class="muted" style="min-height:36px;">
        {{ p.description || 'Açıklama yok' }}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div class="muted small">
          {{ p.createdAt | date:'yyyy-MM-dd HH:mm' }}
        </div>

       <div style="display:flex;gap:10px;">
        
  <button *ngIf="canManageProjects"
        class="btn danger"
        (click)="deleteProject(p)"
        [disabled]="deleting[p.id]">
  {{ deleting[p.id] ? 'Siliniyor…' : 'Sil' }}
</button>

  <button class="btn primary" (click)="openProject(p.id)">
    Detay
  </button>
</div>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
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
`],
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  loading = false;
  error = '';
  deleting: Record<number, boolean> = {};

  get canManageProjects(): boolean {
    return this.auth.hasAnyRole('Lead', 'Admin');
  }
  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.fetch();
  }

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

  openProject(id: number) {
    this.router.navigateByUrl(`/projects/${id}`);
  }

  addProject() {
    this.router.navigateByUrl('/projects/create');
  }

  goDashboard() {
    this.router.navigateByUrl('/');
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  deleteProject(p: Project) {

    if (!this.canManageProjects) {
      this.error = 'Bu işlem için yetkin yok.';
      return;
    }
    const ok = confirm(`"${p.name}" projesini silmek istiyor musun?`);
    if (!ok) return;
    this.error = '';
    this.deleting[p.id] = true;
    const prev = this.projects;
    this.projects = this.projects.filter(x => x.id !== p.id);
    this.cd.detectChanges();
    this.http.delete(`${environment.apiUrl}/api/Projects/${p.id}`, { responseType: 'text' })
      .pipe(finalize(() => {
        delete this.deleting[p.id];
        this.cd.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.cd.detectChanges();
        },
        error: (err) => {
          this.projects = prev;

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
}
