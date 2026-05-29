import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../layout/header.component';

type LeaderItem = { userId: number; name: string | null; email: string | null; completed: number };
type DayItem = { date: string; completed: number };
type StatusPost = { id: number; userId: number; userName: string | null; message: string; createdAt: string };

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
  imports: [HeaderComponent, FormsModule],
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

    <!-- Üyelik süresi banner -->
    @if (memberSince) {
      <div class="member-banner">
        <div class="member-left">
          <div class="member-avatar">{{ nameInitial }}</div>
          <div>
            <div class="member-hello">Hoş geldin, <strong>{{ memberName }}</strong> 👋</div>
            <div class="member-since">{{ memberRole }} · {{ memberSince }} tarihinden beri üyesin</div>
          </div>
        </div>
        <div class="member-duration">
          <div class="member-dur-val">{{ sessionTime }}</div>
          <div class="member-dur-label">bu oturumda geçen süre</div>
        </div>
      </div>
    }

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

    <!-- Çevrimiçi süre tablosu (Admin/Lead) -->
    @if (canSeeReport) {
      <div class="card session-card">
        <div class="session-head">
          <div class="card-title" style="margin:0">Kullanıcı Çevrimiçi Süreleri</div>
          <div class="day-tabs">
            @for (opt of dayOpts; track opt) {
              <button type="button" class="day-tab" [class.active]="reportDays === opt" (click)="setReportDays(opt)">
                Son {{ opt }} gün
              </button>
            }
          </div>
        </div>

        <div class="report-content" [class.report-fading]="reportLoading">
          @if (sessionReport.length === 0 && !reportLoading) {
            <div class="muted small" style="padding:8px 0">Henüz oturum verisi yok.</div>
          } @else if (sessionReport.length === 0 && reportLoading) {
            <div class="report-skeleton">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="skeleton-row"></div>
              }
            </div>
          } @else {
            <div class="report-table">
              <div class="report-header">
                <div>Kullanıcı</div>
                <div>Tarih</div>
                <div>Süre</div>
                <div>Durum</div>
              </div>
              @for (row of sessionReport; track row.userId + row.date) {
                <div class="report-row">
                  <div class="report-name">{{ row.userName }}</div>
                  <div class="report-date">{{ row.date }}</div>
                  <div class="report-dur">{{ fmtDuration(row.totalMinutes) }}</div>
                  <div class="report-bar-wrap">
                    <div class="report-bar" [style.width.%]="barPct(row.totalMinutes)"></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- Durum Akışı -->
    <div class="card feed-card">
      <div class="feed-head">
        <div class="card-title" style="margin:0">Durum Akışı</div>
        <span class="feed-live">● canlı</span>
      </div>

      <form class="feed-form" (ngSubmit)="postStatus()">
        <input
          class="feed-input"
          type="text"
          [(ngModel)]="newStatus"
          name="newStatus"
          placeholder="Günaydın! / #3 görevi inceliyorum…"
          maxlength="120"
          autocomplete="off" />
        <div class="feed-form-row">
          <span class="feed-char" [class.feed-char-warn]="newStatus.length > 100">{{ newStatus.length }}/120</span>
          <button type="submit" class="feed-btn" [disabled]="!newStatus.trim() || posting">
            {{ posting ? '…' : 'Paylaş' }}
          </button>
        </div>
      </form>

      <div class="feed-list">
        @if (feedLoading && statusPosts.length === 0) {
          <div class="feed-empty muted small">Yükleniyor…</div>
        } @else if (statusPosts.length === 0) {
          <div class="feed-empty muted small">Henüz durum paylaşılmamış. İlk sen paylaş! 👋</div>
        } @else {
          @for (p of statusPosts; track p.id) {
            <div class="feed-item" [class.feed-own]="p.userId === currentUserId">
              <div class="feed-av">{{ initial(p.userName) }}</div>
              <div class="feed-body">
                <div class="feed-meta">
                  <span class="feed-name">{{ p.userName || 'Kullanıcı' }}</span>
                  <span class="feed-time">{{ timeAgo(p.createdAt) }}</span>
                </div>
                <div class="feed-msg">{{ p.message }}</div>
              </div>
              @if (p.userId === currentUserId || isAdmin) {
                <button type="button" class="feed-del" title="Sil" (click)="deletePost(p.id)">✕</button>
              }
            </div>
          }
        }
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
  <footer class="app-footer">v0.3.1</footer>
</div>
`,
  styles: [`
/* ── Member banner ── */
.member-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 22px;
  border-radius: var(--radius);
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.09);
  margin-bottom: 14px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2);
  position: relative;
  overflow: hidden;
}

.member-banner::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(var(--radius) + 1px);
  background: radial-gradient(400px 120px at 0% 50%, rgba(124,92,255,.10), transparent 65%);
  pointer-events: none;
}

.member-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.member-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 900;
  flex-shrink: 0;
}

.member-hello {
  font-size: 15px;
  font-weight: 600;
}

.member-since {
  font-size: 12px;
  opacity: .5;
  margin-top: 3px;
}

.member-duration {
  text-align: right;
  flex-shrink: 0;
}

.member-dur-val {
  font-size: 32px;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.member-dur-label {
  font-size: 12px;
  opacity: .5;
  margin-top: 3px;
}

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

/* ── Session report ── */
.session-card {
  padding: 18px 20px;
  margin-bottom: 14px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) .1s both;
}

.session-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.day-tabs {
  display: flex;
  gap: 4px;
}

.day-tab {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}

.day-tab:hover  { background: rgba(255,255,255,.09); }
.day-tab.active { background: rgba(124,92,255,.22); border-color: rgba(124,92,255,.45); }

.report-content {
  transition: opacity 0.18s ease;
  min-height: 120px;
}

.report-fading {
  opacity: 0.35;
  pointer-events: none;
}

.report-skeleton {
  display: grid;
  gap: 6px;
  padding: 4px 0;
}

.skeleton-row {
  height: 38px;
  border-radius: 10px;
  background: rgba(255,255,255,.05);
  animation: skel-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes skel-pulse {
  from { opacity: 0.4; }
  to   { opacity: 0.8; }
}

.report-table { display: grid; gap: 4px; }

.report-header {
  display: grid;
  grid-template-columns: 160px 110px 90px 1fr;
  gap: 10px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  opacity: .45;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.report-row {
  display: grid;
  grid-template-columns: 160px 110px 90px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background .15s;
}

.report-row:hover { background: rgba(255,255,255,.04); }

.report-name { font-weight: 700; font-size: 14px; }
.report-date { font-size: 13px; opacity: .6; }
.report-dur  { font-weight: 700; font-size: 13px; color: rgba(124,200,255,.9); }

.report-bar-wrap {
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  overflow: hidden;
}

.report-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), var(--primary-2));
  transition: width .8s cubic-bezier(.4,0,.2,1);
}

/* ── Feed ── */
.feed-card {
  padding: 18px 20px;
  margin-bottom: 14px;
  animation: card-in .4s cubic-bezier(.22,.68,0,1.2) .15s both;
}

.feed-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.feed-live {
  font-size: 11px;
  font-weight: 700;
  color: rgba(80,220,140,.85);
  animation: live-pulse 2s ease-in-out infinite;
}

@keyframes live-pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .4; }
}

.feed-form { display: grid; gap: 6px; margin-bottom: 16px; }

.feed-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.11);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.feed-input:focus {
  background: rgba(255,255,255,.09);
  border-color: rgba(120,90,255,.5);
  box-shadow: 0 0 0 3px rgba(120,90,255,.12);
}
.feed-input::placeholder { opacity: .35; }

.feed-form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feed-char { font-size: 11px; opacity: .35; }
.feed-char-warn { color: #ffaa55; opacity: 1; }

.feed-btn {
  padding: 7px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform .12s, box-shadow .15s, opacity .15s;
}
.feed-btn:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(120,90,255,.35); }
.feed-btn:active:not(:disabled) { transform: translateY(0); }
.feed-btn:disabled { opacity: .4; cursor: not-allowed; }

.feed-list { display: grid; gap: 8px; }

.feed-empty { padding: 8px 0; }

.feed-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  animation: feed-in .3s cubic-bezier(.22,.68,0,1.2) both;
  transition: background .15s, border-color .15s;
}
.feed-item:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); }
.feed-own { border-color: rgba(120,90,255,.22); background: rgba(120,90,255,.07); }

@keyframes feed-in {
  from { opacity: 0; transform: translateY(-8px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.feed-av {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  flex-shrink: 0;
}

.feed-body { flex: 1; min-width: 0; }

.feed-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}

.feed-name { font-size: 13px; font-weight: 800; }
.feed-time { font-size: 11px; opacity: .4; }

.feed-msg {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.feed-del {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  padding: 4px 6px;
  border-radius: 6px;
  transition: opacity .15s, background .15s;
  flex-shrink: 0;
  align-self: flex-start;
}
.feed-item:hover .feed-del { opacity: .4; }
.feed-del:hover { opacity: 1 !important; background: rgba(255,80,80,.15); color: #ff8099; }

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
export class DashboardComponent implements OnInit, OnDestroy {
  data: DashboardSummary | null = null;
  loading = false;
  error = '';

  memberSince = '';
  memberDays = 0;
  memberName = '';
  memberRole = '';
  nameInitial = '';
  sessionTime = '00:00:00';

  canSeeReport = false;
  reportDays = 7;
  reportLoading = false;
  sessionReport: { userId: number; userName: string; date: string; totalMinutes: number }[] = [];
  readonly dayOpts = [7, 14, 30];

  statusPosts: StatusPost[] = [];
  newStatus = '';
  posting = false;
  feedLoading = false;
  currentUserId = 0;
  isAdmin = false;

  private timerInterval?: ReturnType<typeof setInterval>;
  private reportInterval?: ReturnType<typeof setInterval>;
  private feedInterval?: ReturnType<typeof setInterval>;
  private baseElapsed = 0;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.reportInterval);
    clearInterval(this.feedInterval);
  }

  private startSessionTimer(): void {
    if (!sessionStorage.getItem('tm_session_start')) {
      sessionStorage.setItem('tm_session_start', String(Date.now()));
    }
    this.baseElapsed = this.auth.getSessionElapsed();
    const startedAt = Date.now();
    const tick = () => {
      const diff = this.baseElapsed + Math.floor((Date.now() - startedAt) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      this.sessionTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      this.cd.detectChanges();
    };
    tick();
    this.timerInterval = setInterval(tick, 1000);
  }

  ngOnInit(): void {
    this.startSessionTimer();
    this.canSeeReport = this.auth.hasAnyRole('Admin', 'Lead');
    if (this.canSeeReport) {
      this.loadSessionReport();
      this.reportInterval = setInterval(() => this.loadSessionReport(), 60_000);
    }
    this.http.get<any>(`${environment.apiUrl}/api/users/me`).subscribe({
      next: (me) => {
        this.memberName = me.name || me.email || 'Kullanıcı';
        this.nameInitial = this.memberName.charAt(0).toUpperCase();
        this.currentUserId = me.id ?? 0;
        this.isAdmin = me.role === 'Admin';
        const roleMap: Record<string, string> = { Admin: 'Admin', Lead: 'Lider', Junior: 'Junior' };
        this.memberRole = roleMap[me.role] ?? me.role ?? '';
        if (me.createdAt) {
          const joined = new Date(me.createdAt);
          this.memberSince = joined.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
          this.memberDays = Math.floor((Date.now() - joined.getTime()) / 86_400_000);
        }
        this.cd.detectChanges();
      },
      error: () => {}
    });

    this.loadFeed();
    this.feedInterval = setInterval(() => this.loadFeed(), 5_000);

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

  setReportDays(d: number) {
    this.reportDays = d;
    this.loadSessionReport();
  }

  loadSessionReport() {
    this.reportLoading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/sessions/report?days=${this.reportDays}`).subscribe({
      next: (rows) => { this.sessionReport = rows ?? []; this.reportLoading = false; this.cd.detectChanges(); },
      error: () => { this.reportLoading = false; this.cd.detectChanges(); }
    });
  }

  fmtDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
  }

  barPct(minutes: number): number {
    const max = Math.max(1, ...this.sessionReport.map(r => r.totalMinutes));
    return Math.round((minutes / max) * 100);
  }

  barWidth(value: number): number {
    const max = Math.max(1, ...(this.data?.completedLast7Days?.map(x => x.completed) ?? [1]));
    return Math.min(100, Math.round((value / max) * 100));
  }

  loadFeed(): void {
    this.feedLoading = true;
    this.http.get<StatusPost[]>(`${environment.apiUrl}/api/status-posts`).subscribe({
      next: (posts) => { this.statusPosts = posts ?? []; this.feedLoading = false; this.cd.detectChanges(); },
      error: () => { this.feedLoading = false; this.cd.detectChanges(); }
    });
  }

  postStatus(): void {
    const msg = this.newStatus.trim();
    if (!msg || this.posting) return;
    this.posting = true;
    this.http.post<StatusPost>(`${environment.apiUrl}/api/status-posts`, { message: msg }).subscribe({
      next: (p) => {
        this.statusPosts = [p, ...this.statusPosts].slice(0, 50);
        this.newStatus = '';
        this.posting = false;
        this.cd.detectChanges();
      },
      error: () => { this.posting = false; this.cd.detectChanges(); }
    });
  }

  deletePost(id: number): void {
    this.http.delete(`${environment.apiUrl}/api/status-posts/${id}`).subscribe({
      next: () => { this.statusPosts = this.statusPosts.filter(p => p.id !== id); this.cd.detectChanges(); },
      error: () => {}
    });
  }

  initial(name: string | null): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)  return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }
}
