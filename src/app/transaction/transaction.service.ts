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
      userId: expense.userId ?? 0 
    }));

    // Converter receitas para formato unificado
    const unifiedIncomes: UnifiedTransaction[] = incomes.map(income => {
      const categoryData = (income as any).category || (income as any).incomeCategory;
      
      return {
        id: income.incomeId as number,
        type: 'INCOME' as const,
        date: income.date,
        amount: income.amount,
        category: categoryData ? {
          id: categoryData.incomeCategoryId || categoryData.id,
          name: categoryData.name
        } : null,
        destination: income.paymentOrigin,
        account: income.balanceSource,
        observation: income.observation,
        userId: income.userId ?? 0 
      };
    });

    // Unificar e ordenar por data
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

  // NOVO: Atualizar transação baseada no tipo
  async updateTransaction(type: TransactionType, id: number, data: any): Promise<any> {
    try {
      console.log(`🔄 Atualizando ${type} com ID ${id}:`, data);
      
      if (type === 'EXPENSE') {
        return await this.expenseService.updateExpense(id, data);
      } else {
        return await this.incomeService.updateIncome(id, data);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${type}:`, error);
      throw error;
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