import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExpenseService } from '../expense/expense.service';
import { IncomeService } from '../income/income.service';
import { DashboardService, MonthlyData, CategoryData } from './dashboard.service';

interface DashboardStats {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface CategoryChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface RecentTransaction {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category: string;
  amount: number;
  date: string;
  account: string;
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
  private dashboardService = inject(DashboardService);

  stats: DashboardStats = {
    totalIncomes: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0
  };

  chartData: ChartData[] = [];
  categoryData: CategoryChartData[] = [];
  recentTransactions: RecentTransaction[] = [];
  
  loading = false;
  errorMessage = '';
  chartsLoading = false;
  chartsError = '';

  // Cores para as categorias
  private categoryColors = [
    '#2E3CB3', '#1877F2', '#0072B0', '#4F8AFF', '#71A0FE',
    '#4facfe', '#40ADFF', '#222653', '#443AD8'
  ];

  // Nomes dos meses
  private monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    this.errorMessage = '';

    try {
      console.log('Carregando estatísticas do dashboard...');

      // Carregar dados básicos
      const [expenses, incomes] = await Promise.all([
        this.expenseService.getAllExpenses().catch(() => []),
        this.incomeService.getAllIncomes().catch(() => [])
      ]);

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

      this.processRecentTransactions(expenses, incomes);

      await this.loadChartsData();

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

  async loadChartsData() {
    this.chartsLoading = true;
    this.chartsError = '';

    try {
      const currentYear = new Date().getFullYear();
      
      const [monthlyExpenses, monthlyIncomes, categoryExpenses] = await Promise.all([
        this.dashboardService.getMonthlyExpenses(currentYear),
        this.dashboardService.getMonthlyIncomes(currentYear),
        this.dashboardService.getExpensesByCategory(currentYear)
      ]);

      console.log('Dados mensais - Despesas:', monthlyExpenses);
      console.log('Dados mensais - Receitas:', monthlyIncomes);
      console.log('Dados por categoria:', categoryExpenses);

      this.processMonthlyData(monthlyExpenses, monthlyIncomes);

      this.processCategoryData(categoryExpenses);

    } catch (error: any) {
      console.error('Erro ao carregar dados dos gráficos:', error);
      this.chartsError = 'Erro ao carregar gráficos';
    } finally {
      this.chartsLoading = false;
    }
  }

  private processMonthlyData(expenses: MonthlyData[], incomes: MonthlyData[]) {
    const expenseMap = new Map(expenses.map(e => [`${e.year}-${e.month}`, e.total]));
    const incomeMap = new Map(incomes.map(i => [`${i.year}-${i.month}`, i.total]));

    const chartData: ChartData[] = [];
    const currentDate = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      const receitas = Number(incomeMap.get(key) || 0);
      const despesas = Number(expenseMap.get(key) || 0);
      const saldo = receitas - despesas;

      chartData.push({
        month: this.monthNames[month - 1],
        receitas: receitas,
        despesas: despesas,
        saldo: saldo
      });
    }

    this.chartData = chartData;
    console.log('Dados do gráfico (últimos 4 meses):', this.chartData);
  }

  private processCategoryData(categories: CategoryData[]) {
    if (categories.length === 0) {
      this.categoryData = [];
      return;
    }

    const total = categories.reduce((sum, cat) => sum + Number(cat.total), 0);

    this.categoryData = categories.map((cat, index) => ({
      name: cat.categoryName,
      value: Number(cat.total),
      percentage: Math.round((Number(cat.total) / total) * 100),
      color: this.categoryColors[index % this.categoryColors.length]
    }));
  }

  private processRecentTransactions(expenses: any[], incomes: any[]) {
    const allTransactions: RecentTransaction[] = [];

    incomes.forEach(income => {
      allTransactions.push({
        id: income.incomeId,
        type: 'INCOME',
        description: income.paymentOrigin || 'Receita',
        category: income.category?.name || 'Sem categoria',
        amount: income.amount,
        date: income.date,
        account: income.balanceSource || 'Conta'
      });
    });

    expenses.forEach(expense => {
      allTransactions.push({
        id: expense.expenseId,
        type: 'EXPENSE',
        description: expense.paymentDestination || 'Despesa',
        category: expense.category?.name || 'Sem categoria',
        amount: expense.amount,
        date: expense.date,
        account: expense.balanceSource || 'Conta'
      });
    });


    const sortedTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    this.recentTransactions = sortedTransactions.slice(0, 5);
    
    console.log(`Total de transações: ${sortedTransactions.length}, Exibindo: ${this.recentTransactions.length}`);
  }

  getMaxValue(): number {
    if (this.chartData.length === 0) return 10000;
    
    const maxIncome = Math.max(...this.chartData.map(d => d.receitas));
    const maxExpense = Math.max(...this.chartData.map(d => d.despesas));
    const maxBalance = Math.max(...this.chartData.map(d => Math.abs(d.saldo)));
    
    const maxValue = Math.max(maxIncome, maxExpense, maxBalance, 1000);
    return Math.ceil(maxValue / 1000) * 1000; 
  }

  getYAxisLabels(): string[] {
    const maxValue = this.getMaxValue();
    const step = maxValue / 2;
    
    return [
      this.formatCurrencyShort(maxValue),
      this.formatCurrencyShort(step),
      'R$ 0'
    ];
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    } else {
      return `R$ ${value.toFixed(0)}`;
    }
  }

  getAbsoluteHeight(saldo: number): number {
    return Math.abs(saldo / this.getMaxValue()) * 240;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('pt-BR');
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  }

  getBalanceStatus(): string {
    if (this.stats.balance > 0) return 'positive';
    if (this.stats.balance < 0) return 'negative';
    return 'neutral';
  }

  getTransactionInitial(description: string): string {
    return description.charAt(0).toUpperCase();
  }

  refreshData() {
    this.loadDashboardData();
  }

  goToTransactions() {
    this.router.navigate(['/transacoes']);
  }
}