import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { InvestmentProfileService } from '../investment-profile/investment-profile.service';
import { InvestmentRecommendationsService, InvestmentRecommendation } from '../investment-recommendations/investment-recommendations.service';
import { InvestorProfileResponseDTO } from '../entity/investment-profile';
import { environment } from '../../../environments/environment.prod';

export interface UserProfileData {
  personalInfo: {
    name: string;
    email: string;
    role: string;
    memberSince?: string;
  };
  investorProfile: InvestorProfileResponseDTO | null;
  recommendations: InvestmentRecommendation | null;
  hasCompletedProfile: boolean;
}

export interface UserStats {
  totalPiggyBanks: number;
  completedGoals: number;
  totalSaved: number;
  activeInvestments: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private investmentProfileService = inject(InvestmentProfileService);
  private recommendationsService = inject(InvestmentRecommendationsService);
  private apiUrl = environment.apiUrl;

  getUserProfileData(): Observable<UserProfileData> {
    // Dados pessoais básicos
    const personalInfo = {
      name: this.authService.getUserName() || 'Usuário',
      email: this.authService.getUserEmail() || '',
      role: this.authService.getUserRole() || 'USER',
      memberSince: this.calculateMemberSince()
    };

    // Buscar perfil do investidor e recomendações em paralelo
    const profileRequest = this.investmentProfileService.getCurrentUserProfile().pipe(
      catchError(() => of(null))
    );

    const recommendationsRequest = this.recommendationsService.getRecommendations().pipe(
      catchError(() => of(null))
    );

    return forkJoin({
      investorProfile: profileRequest,
      recommendations: recommendationsRequest
    }).pipe(
      map(({ investorProfile, recommendations }) => ({
        personalInfo,
        investorProfile,
        recommendations,
        hasCompletedProfile: !!investorProfile
      }))
    );
  }

  getUserStats(): Observable<UserStats> {
    // Buscar estatísticas do usuário de diferentes endpoints
    const piggyBankStats$ = this.http.get<any>(`${this.apiUrl}/piggy-bank/summary`).pipe(
      catchError(() => of({ totalPiggyBanks: 0, completedPiggyBanks: 0, totalSaved: 0 }))
    );

    return piggyBankStats$.pipe(
      map(piggyData => ({
        totalPiggyBanks: piggyData.totalPiggyBanks || 0,
        completedGoals: piggyData.completedPiggyBanks || 0,
        totalSaved: piggyData.totalSaved || 0,
        activeInvestments: 0 // Pode ser implementado futuramente
      }))
    );
  }

  updateUserProfile(data: { name?: string }): Observable<any> {
    // Implementar quando tiver endpoint de atualização de dados pessoais
    return of({ success: true });
  }

  private calculateMemberSince(): string {
    // Por enquanto, calcular baseado no token ou usar uma data padrão
    // Isso deveria vir do backend idealmente
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const issuedAt = payload.iat * 1000; // Converter para milliseconds
        return new Date(issuedAt).toLocaleDateString('pt-BR');
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    }
    
    // Fallback: usar data atual
    return new Date().toLocaleDateString('pt-BR');
  }

  getRiskProfileText(riskProfile: string): string {
    return this.recommendationsService.getRiskProfileText(riskProfile);
  }

  getRiskProfileColor(riskProfile: string): string {
    return this.recommendationsService.getRiskProfileColor(riskProfile);
  }

  getRiskProfileDescription(riskProfile: string): string {
    return this.recommendationsService.getRiskProfileDescription(riskProfile);
  }
}