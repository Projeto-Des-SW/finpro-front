import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mobile-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="mobile-header">
      <button class="hamburger-btn" (click)="toggleSidebar()">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      
      <h1 class="header-title">FinPro</h1>
      
      <div class="header-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .mobile-header {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 60px;
    }

    @media (max-width: 768px) {
      .mobile-header {
        display: flex;
      }
    }

    .hamburger-btn {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 44px;
      height: 44px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }

    .hamburger-btn:hover {
      background: #f8f9fa;
    }

    .hamburger-btn:active {
      background: #e9ecef;
    }

    .hamburger-line {
      display: block;
      width: 24px;
      height: 3px;
      background: #333;
      margin: 2px 0;
      border-radius: 2px;
      transition: all 0.3s ease;
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: #2E3CB3;
      margin: 0;
      flex: 1;
      text-align: center;
    }

    .header-actions {
      min-width: 44px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class MobileHeaderComponent {
  @Output() sidebarToggle = new EventEmitter<void>();

  toggleSidebar() {
    this.sidebarToggle.emit();
  }
}