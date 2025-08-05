// Interface unificada para transações
export interface UnifiedTransaction {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  category: {
    id: number;
    name: string;
  } | null;
  destination: string; // paymentDestination ou paymentOrigin
  account: string;     // balanceSource
  observation?: string;
  userId: number;
}

// Tipos para facilitar o mapeamento
export type TransactionType = 'INCOME' | 'EXPENSE';