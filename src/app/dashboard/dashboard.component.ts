import { Component, inject, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExpenseService } from '../expense/expense.service';
import { IncomeService } from '../income/income.service';
import { DashboardService, MonthlyData, CategoryData, PiggyBankSummaryData } from './dashboard.service';
import { PdfExportModalComponent } from '../shared/pdf-export-modal.component';

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

interface IncomeCategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PdfExportModalComponent],
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
  incomeCategoryData: CategoryChartData[] = [];
  piggyBankSummary: PiggyBankSummaryData | null = null;

  loading = false;
  errorMessage = '';
  chartsLoading = false;
  chartsError = '';

  readonly pdfExportModal = viewChild.required(PdfExportModalComponent);

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

      // Calcular estatísticas apenas do mês atual
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12

      console.log(`Calculando dados para: ${currentMonth}/${currentYear}`);

      // Filtrar transações do mês atual
      const currentMonthIncomes = this.filterTransactionsByMonth(incomes, currentYear, currentMonth);
      const currentMonthExpenses = this.filterTransactionsByMonth(expenses, currentYear, currentMonth);

      const totalIncomes = currentMonthIncomes.reduce((sum: number, income: any) => sum + (income.amount || 0), 0);
      const totalExpenses = currentMonthExpenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
      const balance = totalIncomes - totalExpenses;
      const transactionCount = currentMonthIncomes.length + currentMonthExpenses.length;

      this.stats = {
        totalIncomes,
        totalExpenses,
        balance,
        transactionCount
      };

      console.log(`Estatísticas do mês ${currentMonth}/${currentYear}:`, this.stats);

      this.processRecentTransactions(currentMonthExpenses, currentMonthIncomes);
      this.processIncomeCategoryData(currentMonthIncomes);

      // Carregar dados dos cofrinhos
      await this.loadPiggyBankSummary();

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

  async loadPiggyBankSummary() {
    try {
      console.log('Carregando resumo dos cofrinhos...');
      this.piggyBankSummary = await this.dashboardService.getPiggyBankSummary();
      
      if (this.piggyBankSummary) {
        console.log('Resumo carregado com sucesso:', {
          total: this.piggyBankSummary.totalPiggyBanks,
          concluidos: this.piggyBankSummary.completedPiggyBanks,
          noPrazo: this.piggyBankSummary.onTrackCount,
          atrasados: this.piggyBankSummary.behindCount,
          totalEconomizado: this.piggyBankSummary.totalSaved,
          totalMetas: this.piggyBankSummary.totalGoals,
          progresso: this.piggyBankSummary.progressPercentage + '%'
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar resumo dos cofrinhos:', error);
      
      // Estado vazio em caso de erro
      this.piggyBankSummary = {
        totalPiggyBanks: 0,
        completedPiggyBanks: 0,
        totalSaved: 0,
        totalGoals: 0,
        progressPercentage: 0,
        onTrackCount: 0,
        behindCount: 0
      };
    }
  }

  openPdfExportModal() {
    this.pdfExportModal().open();
  }

  // =================== MÉTODOS DOS COFRINHOS ===================

  getPiggyBankSubtitle(): string {
    if (!this.piggyBankSummary || this.piggyBankSummary.totalPiggyBanks === 0) {
      return 'Crie suas metas de economia';
    }
    
    const total = this.piggyBankSummary.totalPiggyBanks;
    const completed = this.piggyBankSummary.completedPiggyBanks;
    
    if (completed === total) {
      return `Parabéns! Todos os ${total} cofrinhos concluídos`;
    } else if (completed > 0) {
      return `${completed} de ${total} cofrinhos concluídos`;
    } else {
      return `${total} cofrinho${total > 1 ? 's' : ''} em andamento`;
    }
  }

  getRemainingToSave(): number {
    if (!this.piggyBankSummary) return 0;
    
    const remaining = this.piggyBankSummary.totalGoals - this.piggyBankSummary.totalSaved;
    return Math.max(remaining, 0);
  }

  getAverageProgress(): number {
    if (!this.piggyBankSummary || this.piggyBankSummary.totalPiggyBanks === 0) {
      return 0;
    }
    
    return this.piggyBankSummary.progressPercentage;
  }

  // =================== MÉTODOS AUXILIARES ===================

  private filterTransactionsByMonth(transactions: any[], year: number, month: number): any[] {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth() + 1; // 1-12

      return transactionYear === year && transactionMonth === month;
    });
  }

  async loadChartsData() {
    this.chartsLoading = true;
    this.chartsError = '';

    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12

      console.log(`Carregando dados dos gráficos para: ${currentMonth}/${currentYear}`);

      const [monthlyExpenses, monthlyIncomes, categoryExpenses] = await Promise.all([
        this.dashboardService.getMonthlyExpenses(currentYear),
        this.dashboardService.getMonthlyIncomes(currentYear),
        this.dashboardService.getExpensesByCategory(currentYear, currentMonth)
      ]);

      console.log('Dados mensais - Despesas:', monthlyExpenses);
      console.log('Dados mensais - Receitas:', monthlyIncomes);
      console.log(`Dados por categoria (${currentMonth}/${currentYear}):`, categoryExpenses);

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
      console.log('Nenhuma categoria encontrada para o mês atual');
      return;
    }

    const total = categories.reduce((sum, cat) => sum + Number(cat.total), 0);

    this.categoryData = categories.map((cat, index) => ({
      name: cat.categoryName,
      value: Number(cat.total),
      percentage: Math.round((Number(cat.total) / total) * 100),
      color: this.categoryColors[index % this.categoryColors.length]
    }));

    console.log('Categorias processadas para o mês atual:', this.categoryData);
  }

  private processIncomeCategoryData(incomes: any[]) {
    const categoryMap = new Map<string, number>();

    incomes.forEach(income => {
      const categoryName = income.incomeCategory?.name || income.category?.name || 'Sem categoria';
      const currentAmount = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, currentAmount + income.amount);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);

    this.incomeCategoryData = Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
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

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    console.log(`Transações recentes do mês ${currentMonth}: ${this.recentTransactions.length} de ${sortedTransactions.length} total`);
  }

  // =================== MÉTODOS DE FORMATAÇÃO E CÁLCULO ===================

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

  // =================== MÉTODOS DE NAVEGAÇÃO ===================

  refreshData() {
    this.loadDashboardData();
  }

  goToTransactions() {
    this.router.navigate(['/app/transacoes']);
  }

  goToPiggyBanks() {
    this.router.navigate(['/app/cofrinhos']);
  }

  // =================== MÉTODOS DO GRÁFICO DE PIZZA ===================

  getStrokeDashArray(percentage: number): string {
    const circumference = 2 * Math.PI * 80; // r=80
    const arcLength = (percentage / 100) * circumference;
    return `${arcLength} ${circumference}`;
  }

  getStrokeDashOffset(index: number): number {
    const circumference = 2 * Math.PI * 80;
    let totalPercentage = 0;

    for (let i = 0; i < index; i++) {
      totalPercentage += this.incomeCategoryData[i].percentage;
    }

    return -(totalPercentage / 100) * circumference;
  }

  getSegmentStart(index: number): number {
    let start = 0;
    for (let i = 0; i < index; i++) {
      start += this.incomeCategoryData[i].percentage;
    }
    return start;
  }

  getIncomeTotal(): number {
    return this.incomeCategoryData.reduce((total, segment) => total + segment.value, 0);
  }
}
