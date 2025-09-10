import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InvestmentRecommendation {
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class InvestmentRecommendationsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/investment';

  getRecommendations(): Observable<InvestmentRecommendation> {
    return this.http.get<InvestmentRecommendation>(`${this.apiUrl}/recommendation`);
  }

  getRiskProfileText(riskProfile: string): string {
    switch (riskProfile) {
      case 'CONSERVATIVE':
        return 'Conservador';
      case 'MODERATE':
        return 'Moderado';
      case 'AGGRESSIVE':
        return 'Agressivo';
      default:
        return 'Não definido';
    }
  }

  getRiskProfileDescription(riskProfile: string): string {
    switch (riskProfile) {
      case 'CONSERVATIVE':
        return 'Você prefere investimentos seguros e com baixo risco, priorizando a preservação do capital.';
      case 'MODERATE':
        return 'Você busca um equilíbrio entre segurança e rentabilidade, aceitando riscos moderados.';
      case 'AGGRESSIVE':
        return 'Você está disposto a assumir riscos maiores em busca de rentabilidade superior.';
      default:
        return 'Complete o questionário de perfil do investidor para receber recomendações personalizadas.';
    }
  }

  getRiskProfileColor(riskProfile: string): string {
    switch (riskProfile) {
      case 'CONSERVATIVE':
        return '#28a745'; // Verde
      case 'MODERATE':
        return '#ffc107'; // Amarelo
      case 'AGGRESSIVE':
        return '#dc3545'; // Vermelho
      default:
        return '#6c757d'; // Cinza
    }
  }
}