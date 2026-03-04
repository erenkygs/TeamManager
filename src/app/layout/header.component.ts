import { Component, Input, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { filter, finalize } from 'rxjs/operators';
import { NotificationsService, NotificationItem } from '../core/services/notifications.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="header">
  <div class="left">
    <h1 *ngIf="title">{{ title }}</h1>
    <div class="subtitle" *ngIf="subtitle">{{ subtitle }}</div>
  </div>

  <div class="right">
    <ng-content></ng-content>

    <!-- 🔔 Notifications -->
    <div class="noti-wrap" (click)="$event.stopPropagation()">
      <button class="btn" type="button" (click)="toggleNoti()">
        🔔
        <span *ngIf="unreadCount > 0" class="badge">{{ unreadCount }}</span>
      </button>

      <div *ngIf="notiOpen" class="noti-panel">
        <div class="noti-head">
          <div class="noti-title">Bildirimler</div>
          <button class="btn" type="button" (click)="readAllNoti()" [disabled]="unreadCount === 0">
            Hepsini okundu yap
          </button>
        </div>

        <div *ngIf="notiLoading" class="muted small">Yükleniyor…</div>

        <div *ngIf="!notiLoading && notifications && notifications.length === 0" class="muted small">
          Bildirim yok.
        </div>

        <div *ngIf="!notiLoading && notifications && notifications.length">
          <div *ngFor="let n of notifications"
               class="noti-item"
               (click)="openNoti(n)">
            <div class="noti-row">
              <div>
                <div class="noti-item-title">{{ n.title }}</div>
                <div class="muted small" style="margin-top:4px;">{{ n.message }}</div>
              </div>

              <div *ngIf="!n.isRead" class="dot"></div>
            </div>

            <div class="muted small" style="margin-top:6px;">
              {{ n.createdAt | date:'yyyy-MM-dd HH:mm' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="btn"
            *ngIf="!isDashboard()"
            (click)="goDashboard()">
      Ana Sayfa
    </button>

    <button class="btn"
            *ngIf="!currentUrl.startsWith('/projects')"
            (click)="goProjects()">
      Projeler
    </button>

    <button class="btn"
            *ngIf="!currentUrl.startsWith('/profile')"
            (click)="goProfile()">
      Profilim
    </button>

    <button class="btn"
            *ngIf="!currentUrl.startsWith('/team')"
            (click)="goTeam()">
      Ekip
    </button>

    <button class="btn" (click)="logout()">
      Çıkış Yap
    </button>
  </div>
</div>
`,
  styles: [`
.header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  margin-bottom:20px;
}
.left h1{
  margin:0;
  font-size:34px;
  font-weight:900;
  line-height:1.1;
}
.subtitle{
  margin-top:6px;
  opacity:.7;
}
.right{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
  justify-content:flex-end;
}

/* 🔔 notifications */
.noti-wrap{ position:relative; }
.badge{
  margin-left:6px;
  padding:2px 8px;
  border-radius:999px;
  background: rgba(255,92,122,.25);
  border: 1px solid rgba(255,92,122,.45);
  font-weight:900;
  font-size:12px;
}
.noti-panel{
  position:absolute;
  right:0;
  top:46px;
  width:min(420px, 85vw);
  background:#0f1420;
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;
  padding:10px;
  box-shadow:0 10px 40px rgba(0,0,0,.35);
  z-index:50;
}
.noti-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  margin-bottom:8px;
}
.noti-title{ font-weight:900; }
.noti-item{
  cursor:pointer;
  padding:10px;
  border-radius:12px;
  margin-top:8px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03);
}
.noti-item:hover{
  background:rgba(255,255,255,.06);
}
.noti-row{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:flex-start;
}
.noti-item-title{ font-weight:900; }
.dot{
  width:10px;
  height:10px;
  border-radius:999px;
  background: rgba(125,255,179,.85);
  margin-top:4px;
  flex:0 0 auto;
}
`]
})
export class HeaderComponent implements OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  currentUrl = '';
  notiOpen = false;
  notiLoading = false;
  unreadCount = 0;
  notifications: NotificationItem[] | null = null;

  private pollSub?: Subscription;

  constructor(
    private router: Router,
    private auth: AuthService,
    private noti: NotificationsService,
    private cd: ChangeDetectorRef
  ) {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.currentUrl = this.router.url;
        if (this.auth.isLoggedIn()) this.refreshUnread();
      });

    if (this.auth.isLoggedIn()) {
      this.refreshUnread();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  @HostListener('document:click')
  onDocClick() {
    if (!this.notiOpen) return;
    setTimeout(() => {
      this.notiOpen = false;
      this.cd.detectChanges();
    }, 0);
  }

  toggleNoti() {
    this.notiOpen = !this.notiOpen;
    if (this.notiOpen) {
      this.notifications = null;
      this.notiLoading = true;

      setTimeout(() => this.loadNoti(), 0);
    }
  }

  private startPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(7000).subscribe(() => {
      if (!this.auth.isLoggedIn()) return;

      this.refreshUnread();
      if (this.notiOpen) this.loadNoti();
    });
  }

  refreshUnread() {
    this.noti.unreadCount().subscribe({
      next: (r) => {
        this.unreadCount = r?.count ?? 0;
        this.cd.detectChanges();
      },
      error: () => { /* sessiz */ }
    });
  }

  loadNoti() {
    this.noti.list(30)
      .pipe(finalize(() => {
        this.notiLoading = false;
        this.cd.detectChanges();
      }))
      .subscribe({
        next: (list) => {
          this.notifications = list ?? [];
          this.refreshUnread();
        },
        error: () => {
          this.notifications = [];
        }
      });
  }

  openNoti(n: NotificationItem) {
    if (!n.isRead) {
      this.noti.markRead(n.id).subscribe({
        next: () => {
          n.isRead = true;
          this.refreshUnread();
          this.cd.detectChanges();
        },
        error: () => { /* sessiz */ }
      });
    }

    this.notiOpen = false;
    this.cd.detectChanges();

    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  readAllNoti() {
    this.noti.readAll().subscribe({
      next: () => {
        if (this.notifications) {
          this.notifications = this.notifications.map(x => ({ ...x, isRead: true }));
        }
        this.unreadCount = 0;
        this.cd.detectChanges();
      },
      error: () => { /* sessiz */ }
    });
  }

  isDashboard(): boolean {
    return this.currentUrl === '/' || this.currentUrl.startsWith('/?');
  }

  goDashboard() { this.router.navigateByUrl('/'); }
  goProjects() { this.router.navigateByUrl('/projects'); }
  goProfile() { this.router.navigateByUrl('/profile'); }
  goTeam() { this.router.navigateByUrl('/team'); }
  logout() {
    this.pollSub?.unsubscribe();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}