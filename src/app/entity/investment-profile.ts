export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type RiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';
export type InvestmentTerm = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
export type KnowledgeLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface QuestionnaireAnswer {
  questionId: number;
  selectedValue: number;
}

export interface QuestionnaireResponseDTO {
  answers: QuestionnaireAnswer[];
}

export interface ProfileCalculationResultDTO {
  riskProfile: RiskProfile;
  riskTolerance: RiskTolerance;
  investmentTerm: InvestmentTerm;
  knowledgeLevel: KnowledgeLevel;
  totalScore: number;
}

export interface InvestorProfileRequestDTO {
  riskProfile: RiskProfile;
  riskTolerance: RiskTolerance;
  investmentTerm: InvestmentTerm;
  knowledgeLevel: KnowledgeLevel;
  score: number;
  answers: QuestionnaireAnswer[];
}

export interface InvestorProfileResponseDTO {
  id?: number;
  userId?: number;
  riskProfile: RiskProfile;
  riskTolerance: RiskTolerance;
  investmentTerm: InvestmentTerm;
  knowledgeLevel: KnowledgeLevel;
  score: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
  category: string;
  weight: number;
}

export interface QuestionOption {
  value: number;
  text: string;
  score: number;
}

