import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExpenseService } from '../expense/expense.service';
import { IncomeService } from '../income/income.service';

interface DashboardStats {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private expenseService = inject(ExpenseService);
  private incomeService = inject(IncomeService);

  stats: DashboardStats = {
    totalIncomes: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0
  };

  loading = false;
  errorMessage = '';

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardStats();
  }

  async loadDashboardStats() {
    this.loading = true;
    this.errorMessage = '';

    try {
      console.log('Carregando estatísticas do dashboard...');

      const [expenses, incomes] = await Promise.all([
        this.expenseService.getAllExpenses().catch(error => {
          console.warn('Erro ao carregar despesas:', error);
          return [];
        }),
        this.incomeService.getAllIncomes().catch(error => {
          console.warn('Erro ao carregar receitas:', error);
          return [];
        })
      ]);

      console.log('Receitas encontradas:', incomes.length);
      console.log('Despesas encontradas:', expenses.length);

      const totalIncomes = incomes.reduce((sum: number, income: any) => sum + (income.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
      const balance = totalIncomes - totalExpenses;
      const transactionCount = incomes.length + expenses.length;

      this.stats = {
        totalIncomes,
        totalExpenses,
        balance,
        transactionCount
      };

      console.log('Estatísticas:', this.stats);

    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      this.errorMessage = 'Erro ao carregar dados do dashboard';
      
      this.stats = {
        totalIncomes: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0
      };
    } finally {
      this.loading = false;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  getBalanceStatus(): string {
    if (this.stats.balance > 0) return 'positive';
    if (this.stats.balance < 0) return 'negative';
    return 'neutral';
  }

  // Método para recarregar dados
  refreshData() {
    this.loadDashboardStats();
  }
}