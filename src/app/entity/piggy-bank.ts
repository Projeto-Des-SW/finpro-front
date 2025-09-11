export interface PiggyBank {
  piggyBankId?: number;
  name: string;
  monthlyDeposit: number;
  savingsGoal: number;
  currentAmount: number;
  targetDate: string;
  status: 'ON_TRACK' | 'BEHIND' | 'COMPLETED';
  depositDay?: number;
}

export interface PiggyBankResponse {
  piggyBankId: number;
  name: string;
  monthlyDeposit: number;
  savingsGoal: number;
  currentAmount: number;
  targetDate: string;
  status: 'ON_TRACK' | 'BEHIND' | 'COMPLETED' | 'OVERDUE'; 
  depositDay?: number;
  progressPercentage?: number;
  lastDepositDate?: string;
  recommendedMonthlyDeposit?: number;
}

export type PiggyBankStatusCalculated = 'ON_TRACK' | 'BEHIND' | 'COMPLETED' | 'OVERDUE';

export interface PiggyBankDeposit {
  amount: number;
}

export interface PiggyBankDepositResponse {
  piggyBank: PiggyBankResponse;
  depositedAmount: number;
  message: string;
}

export interface PiggyBankProgress {
  progressPercentage: number;
  remainingMonths: number;
  remainingAmount: number;
  piggyBank: PiggyBankResponse;
}

export interface PiggyBankSummary {
  totalSaved: number;
  totalGoal: number;
  completedPiggyBanks: number;
  totalPiggyBanks: number;
  overallProgressPercentage: number;
}