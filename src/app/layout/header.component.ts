import { Component, Input, HostListener, HostBinding, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
    @if (title)    { <h1>{{ title }}</h1> }
    @if (subtitle) { <div class="subtitle">{{ subtitle }}</div> }
  </div>

  <div class="right">
    <ng-content></ng-content>

    <!-- 🔔 Bildirimler -->
    <div class="noti-wrap" (click)="$event.stopPropagation()">
      <button class="icon-btn" type="button" (click)="toggleNoti()">
        🔔
        @if (unreadCount > 0) {
          <span class="badge">{{ unreadCount }}</span>
        }
      </button>

      @if (notiOpen) {
        <div class="noti-panel">
          <div class="noti-head">
            <div class="noti-title">Bildirimler</div>
            <button class="btn" type="button" (click)="readAllNoti()" [disabled]="unreadCount === 0">
              Hepsini okundu yap
            </button>
          </div>

          @if (notiLoading) {
            <div class="muted small" style="padding:8px 4px;">Yükleniyor…</div>
          }

          @if (!notiLoading && notifications && notifications.length === 0) {
            <div class="muted small" style="padding:8px 4px;">Bildirim yok.</div>
          }

          @if (!notiLoading && notifications && notifications.length) {
            @for (n of notifications; track n.id) {
              <div class="noti-item" (click)="openNoti(n)">
                <div class="noti-row">
                  <div>
                    <div class="noti-item-title">{{ n.title }}</div>
                    <div class="muted small" style="margin-top:4px;">{{ n.message }}</div>
                  </div>
                  @if (!n.isRead) { <div class="dot"></div> }
                </div>
                <div class="muted small" style="margin-top:6px; display:flex; align-items:center; gap:8px;">
                  {{ n.createdAt | date:'yyyy-MM-dd HH:mm' }}
                  <button class="noti-del" type="button" title="Sil" (click)="deleteNoti(n, $event)">🗑</button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- Navigasyon -->
    <nav class="nav-group">
      <button type="button" class="nav-btn" title="" [class.active]="isDashboard()"                        (click)="goDashboard()">Ana Sayfa</button>
      <button type="button" class="nav-btn" title="" [class.active]="currentUrl.startsWith('/projects')"   (click)="goProjects()">Projeler</button>
      <button type="button" class="nav-btn" title="" [class.active]="currentUrl.startsWith('/profile')"    (click)="goProfile()">Profilim</button>
      <button type="button" class="nav-btn" title="" [class.active]="currentUrl.startsWith('/team')"       (click)="goTeam()">Ekip</button>
      <button type="button" class="nav-btn" title="" [class.active]="currentUrl.startsWith('/my-tasks')"  (click)="goMyTasks()">Görevlerim</button>
    </nav>

    <button type="button" class="nav-btn logout-btn" (click)="logout()">Çıkış Yap</button>
  </div>
</div>
`,
  styles: [`
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.left h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  line-height: 1.1;
}

.subtitle {
  margin-top: 6px;
  opacity: .7;
}

.right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── Zil butonu ── */
.icon-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 13px;
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-size: 17px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .18s ease, transform .13s ease,
              border-color .18s ease, box-shadow .18s ease;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: rgba(255,255,255,.11);
  border-color: rgba(255,255,255,.22);
  transform: scale(1.07) translateY(-1px);
  box-shadow: 0 6px 18px rgba(0,0,0,.22);
}

.icon-btn:active { transform: scale(.96); }

/* Badge */
.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255,92,122,.92);
  border: 2px solid #0f1730;
  font-weight: 900;
  font-size: 10px;
  display: grid;
  place-items: center;
  animation: badge-pulse 2.4s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,92,122,.5); }
  55%       { box-shadow: 0 0 0 6px rgba(255,92,122,0); }
}

/* ── Nav grubu ── */
.nav-group {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  backdrop-filter: blur(10px);
}

/* Nav button */
.nav-btn {
  position: relative;
  padding: 8px 15px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background .18s ease, transform .13s ease, box-shadow .18s ease;
  overflow: hidden;
  white-space: nowrap;
}

.nav-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(124,92,255,.18), rgba(54,209,220,.10));
  opacity: 0;
  border-radius: 10px;
  transition: opacity .18s ease;
  pointer-events: none;
}

.nav-btn:hover {
  background: rgba(255,255,255,.09);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0,0,0,.18);
}

.nav-btn:hover::after { opacity: 1; }
.nav-btn:active { transform: translateY(0); box-shadow: none; }

.nav-btn.active {
  background: rgba(255,255,255,.12);
  box-shadow: 0 2px 10px rgba(0,0,0,.18);
}
.nav-btn.active::after { opacity: 1; }

/* Logout */
.logout-btn {
  background: rgba(255,80,80,.07);
  border: 1px solid rgba(255,80,80,.18);
  border-radius: 12px;
  padding: 9px 16px;
}

.logout-btn::after {
  background: rgba(255,80,80,.12);
}

.logout-btn:hover {
  background: rgba(255,80,80,.13);
  border-color: rgba(255,80,80,.35);
  box-shadow: 0 4px 16px rgba(255,80,80,.18);
}

/* ── .btn (bildirim paneli içi) ── */
.btn {
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  color: var(--text);
  padding: 7px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: background .15s;
}

.btn:hover    { background: rgba(255,255,255,.10); }
.btn:disabled { opacity: .4; cursor: default; }

/* ── Bildirim paneli ── */
.noti-wrap { position: relative; }

.noti-panel {
  position: absolute;
  right: 0;
  top: 52px;
  width: min(420px, 85vw);
  background: #0d1322;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 20px 56px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04);
  z-index: 50;
  animation: noti-in .22s cubic-bezier(.175,.885,.32,1.275);
}

@keyframes noti-in {
  from { opacity: 0; transform: translateY(-10px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.noti-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.noti-title { font-weight: 900; }

.noti-item {
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  margin-top: 8px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.03);
  transition: background .15s ease, border-color .15s ease;
}

.noti-item:hover {
  background: rgba(255,255,255,.07);
  border-color: rgba(255,255,255,.13);
}

.noti-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.noti-item-title { font-weight: 900; }

.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(125,255,179,.85);
  box-shadow: 0 0 7px rgba(125,255,179,.5);
  margin-top: 4px;
  flex: 0 0 auto;
}

.noti-del {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: var(--text);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: .65;
  line-height: 1;
  transition: opacity .15s, background .15s, border-color .15s;
}

.noti-del:hover {
  opacity: 1;
  background: rgba(255,80,80,.12);
  border-color: rgba(255,80,80,.28);
}
`]
})
export class HeaderComponent implements OnDestroy {
  @HostBinding('attr.title') readonly _clearTitle = null;

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
      next: (r) => { this.unreadCount = r?.count ?? 0; this.cd.detectChanges(); },
      error: () => {}
    });
  }

  loadNoti() {
    this.noti.list(30)
      .pipe(finalize(() => { this.notiLoading = false; this.cd.detectChanges(); }))
      .subscribe({
        next: (list) => { this.notifications = list ?? []; this.refreshUnread(); },
        error: () => { this.notifications = []; }
      });
  }

  openNoti(n: NotificationItem) {
    if (!n.isRead) {
      this.noti.markRead(n.id).subscribe({
        next: () => { n.isRead = true; this.refreshUnread(); this.cd.detectChanges(); },
        error: () => {}
      });
    }
    this.notiOpen = false;
    this.cd.detectChanges();
    if (n.link) this.router.navigateByUrl(n.link);
  }

  readAllNoti() {
    this.noti.readAll().subscribe({
      next: () => {
        if (this.notifications) this.notifications = this.notifications.map(x => ({ ...x, isRead: true }));
        this.unreadCount = 0;
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }

  deleteNoti(n: NotificationItem, ev: MouseEvent) {
    ev.stopPropagation();
    this.noti.delete(n.id).subscribe({
      next: () => {
        this.notifications = (this.notifications ?? []).filter(x => x.id !== n.id);
        if (!n.isRead && this.unreadCount > 0) this.unreadCount--;
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }

  isDashboard(): boolean { return this.currentUrl === '/' || this.currentUrl.startsWith('/?'); }
  goDashboard() { this.notiOpen = false; this.router.navigateByUrl('/'); }
  goProjects()  { this.notiOpen = false; this.router.navigateByUrl('/projects'); }
  goProfile()   { this.notiOpen = false; this.router.navigateByUrl('/profile'); }
  goTeam()      { this.notiOpen = false; this.router.navigateByUrl('/team'); }
  goMyTasks()   { this.notiOpen = false; this.router.navigateByUrl('/my-tasks'); }
  logout() {
    this.pollSub?.unsubscribe();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
