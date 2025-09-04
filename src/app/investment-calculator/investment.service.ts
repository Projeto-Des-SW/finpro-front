import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaces baseadas no seu backend
export interface InvestmentSimulationDTO {
  startValue: number;
  monthlyValue: number;
  months: number;
  investmentType: InvestmentType;
  percentInvestmentType: number;
}

export interface InvestmentSimulationResponseDTO {
  valorFinal: number;
  totalInvestido: number;
  rendimentoTotal: number;
  taxaEfetivaAnual: number;
  taxaEfetivaMensal: number;
}

export interface InvestmentRecommendationDTO {
  riskProfile: RiskProfile;
  recommendations: string[];
}

// Enums (você precisa confirmar os valores exatos)
export enum InvestmentType {
  SELIC = 'SELIC',
  CDI = 'CDI',
  IPCA = 'IPCA'
  // Adicione os outros tipos conforme seu enum
}

export enum RiskProfile {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE'
}

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/investment';

  async simulate(simulationData: InvestmentSimulationDTO): Promise<InvestmentSimulationResponseDTO> {
    try {
      console.log('Enviando simulação:', simulationData);
      
      const response$ = this.http.post<InvestmentSimulationResponseDTO>(`${this.apiUrl}/simulate`, simulationData);
      const result = await firstValueFrom(response$);
      
      console.log('Resultado da simulação:', result);
      return result;
    } catch (error: any) {
      console.error('Erro na simulação de investimento:', error);
      throw new Error(error?.error?.message || 'Erro ao calcular simulação de investimento');
    }
  }

  async getRecommendations(): Promise<InvestmentRecommendationDTO> {
    try {
      console.log('Buscando recomendações de investimento...');
      
      const response$ = this.http.get<InvestmentRecommendationDTO>(`${this.apiUrl}/recommendation`);
      const result = await firstValueFrom(response$);
      
      console.log('Recomendações recebidas:', result);
      return result;
    } catch (error: any) {
      console.error('Erro ao buscar recomendações:', error);
      throw new Error(error?.error?.message || 'Erro ao buscar recomendações de investimento');
    }
  }

  // Método auxiliar para obter opções de tipos de investimento
  getInvestmentTypes(): Array<{ value: InvestmentType; label: string }> {
    return [
      { value: InvestmentType.SELIC, label: 'Tesouro Selic' },
      { value: InvestmentType.CDI, label: 'CDI' },
      { value: InvestmentType.IPCA, label: 'Tesouro IPCA+' }
    ];
  }

  // Método auxiliar para obter descrição do perfil de risco
  getRiskProfileDescription(profile: RiskProfile): string {
    switch (profile) {
      case RiskProfile.CONSERVATIVE:
        return 'Conservador - Prefere segurança e liquidez';
      case RiskProfile.MODERATE:
        return 'Moderado - Equilibra risco e retorno';
      case RiskProfile.AGGRESSIVE:
        return 'Agressivo - Busca maiores retornos';
      default:
        return 'Perfil não definido';
    }
  }
}