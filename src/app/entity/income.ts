export interface Income {
    incomeId?: number;
    date: string;
    incomeCategoryId?: number;
    amount: number;
    paymentOrigin: string;
    balanceSource: string;
    observation?: string;
    userId?: number;
}