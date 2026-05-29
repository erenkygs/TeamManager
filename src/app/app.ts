import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet><footer class="app-footer">v0.3.1</footer>`
})
export class App implements OnInit {
  ngOnInit() {
    const token = localStorage.getItem('tm_token');
    if (!token) return;

    // sessionStorage F5'te korunur, sekme kapanınca silinir.
    // Eğer tm_session_start varsa → F5 (reload), mevcut oturumu koru.
    // Yoksa → yeni sekme / ilk açılış, yeni oturum başlat.
    if (!sessionStorage.getItem('tm_session_start')) {
      fetch(`${environment.apiUrl}/api/auth/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.sessionId) {
          localStorage.setItem('tm_session_id', String(data.sessionId));
          sessionStorage.setItem('tm_session_start', String(Date.now()));
          sessionStorage.removeItem('tm_session_saved');
        }
      })
      .catch(() => {});
    }
  }
}
