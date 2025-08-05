export interface Expense {
    expenseId?: number;
    date: string;
    expenseCategoryId?: number; 
    amount: number;
    paymentDestination: string;
    balanceSource: string;
    observation?: string;
    userId?: number;
}

export interface ExpenseResponse {
    expenseId: number;
    date: string;
    category: {
        expenseCategoryId: number;
        name: string;
    } | null;
    amount: number;
    paymentDestination: string;
    balanceSource: string;
    observation?: string;
    userId: number;
}

export interface ExpenseCategory {
    expenseCategoryId?: number; 
    name: string;
}