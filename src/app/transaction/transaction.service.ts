import { Injectable, inject } from '@angular/core';
import { ExpenseService } from '../expense/expense.service';
import { IncomeService } from '../income/income.service';
import { IncomeCategoryService, IncomeCategory } from '../income/income-category.service';
import { ExpenseCategory } from '../entity/expense';
import { UnifiedTransaction, TransactionType } from '../entity/transaction';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private expenseService = inject(ExpenseService);
  private incomeService = inject(IncomeService);
  private incomeCategoryService = inject(IncomeCategoryService);

  // Buscar todas as transações unificadas
  async getAllTransactions(): Promise<UnifiedTransaction[]> {
    try {
      const [expenses, incomes] = await Promise.all([
        this.expenseService.getAllExpenses(),
        this.incomeService.getAllIncomes()
      ]);

      // Converter despesas para formato unificado
      const unifiedExpenses: UnifiedTransaction[] = expenses.map(expense => ({
        id: expense.expenseId,
        type: 'EXPENSE' as const,
        date: expense.date,
        amount: expense.amount,
        category: expense.category ? {
          id: expense.category.expenseCategoryId,
          name: expense.category.name
        } : null,
        destination: expense.paymentDestination,
        account: expense.balanceSource,
        observation: expense.observation,
        userId: expense.userId
      }));

      // Converter receitas para formato unificado
      const unifiedIncomes: UnifiedTransaction[] = (incomes as any[]).map(income => ({
        id: income.incomeId,
        type: 'INCOME' as const,
        date: income.date,
        amount: income.amount,
        category: income.category ? {
          id: income.category.incomeCategoryId,
          name: income.category.name
        } : null,
        destination: income.paymentOrigin,
        account: income.balanceSource,
        observation: income.observation,
        userId: income.userId
      }));

      // Unificar e ordenar por data (mais recente primeiro)
      return [...unifiedExpenses, ...unifiedIncomes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
  }

  // Buscar categorias por tipo
  async getCategoriesByType(type: TransactionType): Promise<any[]> {
    if (type === 'EXPENSE') {
      return await this.expenseService.getAllCategories();
    } else {
      return await this.incomeCategoryService.getAllCategories();
    }
  }

  // Criar transação baseada no tipo
  async createTransaction(type: TransactionType, data: any): Promise<any> {
    if (type === 'EXPENSE') {
      return await this.expenseService.createExpense(data);
    } else {
      return await this.incomeService.createIncome(data);
    }
  }

  // Criar categoria baseada no tipo
  async createCategory(type: TransactionType, name: string): Promise<any> {
    if (type === 'EXPENSE') {
      return await this.expenseService.createCategory({ name });
    } else {
      return await this.incomeCategoryService.findOrCreateCategory(name);
    }
  }

  // Deletar transação baseada no tipo
  async deleteTransaction(type: TransactionType, id: number): Promise<void> {
    if (type === 'EXPENSE') {
      return await this.expenseService.deleteExpense(id);
    } else {
      return await this.incomeService.deleteIncome(id);
    }
  }

  // Obter contas únicas de ambos os tipos
  getUniqueAccounts(transactions: UnifiedTransaction[]): string[] {
    const accounts = transactions.map(t => t.account);
    return [...new Set(accounts)].filter(Boolean);
  }

  // Obter categorias únicas de ambos os tipos
  getUniqueCategories(transactions: UnifiedTransaction[]): string[] {
    const categories = transactions
      .map(t => t.category?.name)
      .filter(Boolean) as string[];
    return [...new Set(categories)];
  }
}