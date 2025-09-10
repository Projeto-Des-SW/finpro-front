import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InvestmentRecommendationsService, InvestmentRecommendation } from './investment-recommendations.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-investment-recommendations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investment-recommendations.component.html',
  styleUrls: ['./investment-recommendations.component.css']
})
export class InvestmentRecommendationsComponent implements OnInit {
  private investmentService = inject(InvestmentRecommendationsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  recommendations: InvestmentRecommendation | null = null;
  loading = false;
  error = '';

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadRecommendations();
  }

  loadRecommendations() {
    this.loading = true;
    this.error = '';

    this.investmentService.getRecommendations().subscribe({
      next: (data) => {
        this.recommendations = data;
        this.loading = false;
        console.log('Recomendações carregadas:', data);
      },
      error: (error) => {
        console.error('Erro ao carregar recomendações:', error);
        this.error = this.getErrorMessage(error);
        this.loading = false;
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'Perfil de investidor não encontrado. Complete o questionário primeiro.';
    } else if (error.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    } else {
      return 'Erro ao carregar recomendações. Tente novamente.';
    }
  }

  getRiskProfileText(): string {
    if (!this.recommendations) return '';
    return this.investmentService.getRiskProfileText(this.recommendations.riskProfile);
  }

  getRiskProfileDescription(): string {
    if (!this.recommendations) return '';
    return this.investmentService.getRiskProfileDescription(this.recommendations.riskProfile);
  }

  getRiskProfileColor(): string {
    if (!this.recommendations) return '#6c757d';
    return this.investmentService.getRiskProfileColor(this.recommendations.riskProfile);
  }

  goToProfile() {
    this.router.navigate(['/app/perfil-investimento']);
  }

  goToCalculator() {
    this.router.navigate(['/app/calculadora']);
  }

  goToEducationalContent() {
    this.router.navigate(['/app/conteudo-educacional']);
  }

  retry() {
    this.loadRecommendations();
  }
}