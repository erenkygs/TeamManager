import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit {
  ngOnInit() {
    window.addEventListener('beforeunload', () => {
      const sessionId = Number(localStorage.getItem('tm_session_id') ?? '0');
      const token = localStorage.getItem('tm_token');
      if (!sessionId || !token) return;
      fetch(`${environment.apiUrl}/api/auth/logout`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });
    });
  }
}
