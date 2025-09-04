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

export enum InvestmentType {
  SELIC = 'SELIC',
  CDI = 'CDI',
  IPCA = 'IPCA'
}

export enum RiskProfile {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE'
}

export interface SimulationResult {
  valorFinal: number;
  totalInvestido: number;
  rendimentoTotal: number;
  taxaEfetivaAnual: number;
  taxaEfetivaMensal: number;
}

