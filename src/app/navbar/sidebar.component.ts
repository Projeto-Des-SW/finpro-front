import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  private authService = inject(AuthService);
  private router = inject(Router);

  isCollapsed = false;
  showLogoutModal = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  openLogoutModal() {
    this.showLogoutModal = true;
  }

  closeLogoutModal() {
    this.showLogoutModal = false;
  }

  confirmLogout() {
    this.authService.logout();
    this.showLogoutModal = false;
  }

  logout() {
    this.authService.logout();
  }

  getUserName(): string {
    const name = this.authService.getUserName();
    if (name) {
      return name.split(' ')[0];
    }
    return 'Usuário';
  }

  getUserEmail(): string {
    return this.authService.getUserEmail();
  }
}