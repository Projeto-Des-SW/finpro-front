import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  userName = '';
  userEmail = '';

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserData();
  }

  loadUserData() {
    this.userName = this.authService.getUserName() || 'Usuário';
    this.userEmail = this.authService.getUserEmail() || '';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}