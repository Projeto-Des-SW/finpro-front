import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AuthService } from '../auth/auth.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExpenseService } from '../expense/expense.service';
import { IncomeService } from '../income/income.service';
import { PiggyBankService } from '../piggy-bank/piggy-bank.service';
import { TransactionService } from '../transaction/transaction.service';


Chart.register(...registerables);

export interface PDFExportOptions {
  startDate: string;
  endDate: string;
  includeSummary: boolean;
  includeCharts: boolean;
  includeTransactions: boolean;
  includePiggyBanks: boolean;
  includeCategories: boolean;
}

interface ReportData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    period: string;
  };
  monthlyData: any[];
  categoryData: {
    expenses: any[];
    incomes: any[];
  };
  transactions: any[];
  piggyBanks: any[];
  topCategories: {
    expenses: any[];
    incomes: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private expenseService = inject(ExpenseService);
  private incomeService = inject(IncomeService);
  private piggyBankService = inject(PiggyBankService);
  private transactionService = inject(TransactionService);

  private readonly colors = {
    primary: '#2E3CB3',
    secondary: '#667eea',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    gray: '#6c757d'
  };

  async generatePDF(options: PDFExportOptions): Promise<void> {
    try {
      // Coletar todos os dados necessários
      const reportData = await this.collectReportData(options);

      // Criar novo documento PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let currentY = 20;

      // Adicionar capa
      currentY = this.addCoverPage(pdf, options);

      // Adicionar nova página para o conteúdo
      pdf.addPage();
      currentY = 20;

      // Adicionar resumo financeiro
      if (options.includeSummary) {
        currentY = await this.addFinancialSummary(pdf, reportData.summary, currentY);
      }

      // Adicionar gráficos
      if (options.includeCharts) {
        pdf.addPage();
        currentY = 20;
        currentY = await this.addCharts(pdf, reportData, currentY);
      }

      // Adicionar top categorias
      if (options.includeCategories) {
        pdf.addPage();
        currentY = 20;
        currentY = this.addTopCategories(pdf, reportData.topCategories, currentY);
      }

      // Adicionar lista de transações
      if (options.includeTransactions && reportData.transactions.length > 0) {
        pdf.addPage();
        currentY = 20;
        currentY = this.addTransactionsList(pdf, reportData.transactions, currentY);
      }

      // Adicionar cofrinhos
      if (options.includePiggyBanks && reportData.piggyBanks.length > 0) {
        pdf.addPage();
        currentY = 20;
        currentY = this.addPiggyBanks(pdf, reportData.piggyBanks, currentY);
      }

      // Adicionar numeração de páginas and rodapé
      this.addFooterToAllPages(pdf);

      // Salvar o PDF
      const fileName = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Erro ao gerar relatório PDF');
    }
  }

  private async collectReportData(options: PDFExportOptions): Promise<ReportData> {
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    // Buscar todas as transações
    const allTransactions = await this.transactionService.getAllTransactions();

    // Filtrar transações pelo período
    const filteredTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Calcular resumo
    const incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE');

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Buscar dados mensais
    const currentYear = new Date().getFullYear();
    const [monthlyExpenses, monthlyIncomes] = await Promise.all([
      this.dashboardService.getMonthlyExpenses(currentYear),
      this.dashboardService.getMonthlyIncomes(currentYear)
    ]);

    // Processar categorias
    const expenseCategories = this.groupByCategory(expenseTransactions);
    const incomeCategories = this.groupByCategory(incomeTransactions);

    // Buscar cofrinhos
    const piggyBanks = await this.piggyBankService.getAllPiggyBanks();

    return {
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: filteredTransactions.length,
        period: `${this.formatDate(options.startDate)} até ${this.formatDate(options.endDate)}`
      },
      monthlyData: this.mergeMonthlyData(monthlyExpenses, monthlyIncomes),
      categoryData: {
        expenses: expenseCategories,
        incomes: incomeCategories
      },
      transactions: filteredTransactions.slice(0, 50), // Limitar para não ficar muito grande
      piggyBanks: piggyBanks,
      topCategories: {
        expenses: expenseCategories.slice(0, 5),
        incomes: incomeCategories.slice(0, 5)
      }
    };
  }

  private addCoverPage(pdf: jsPDF, options: PDFExportOptions): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Background gradient simulado
    pdf.setFillColor(46, 60, 179);
    pdf.rect(0, 0, pageWidth, 100, 'F');

    // Logo/Título
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(36);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FinPro', pageWidth / 2, 40, { align: 'center' });

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Relatório Financeiro Detalhado', pageWidth / 2, 55, { align: 'center' });

    // Informações do usuário
    pdf.setTextColor(51, 51, 51);
    pdf.setFontSize(12);

    const token = this.authService.getToken();
    let userName = 'Usuário';
    let userEmail = 'email@exemplo.com';

    if (token) {
      try {
        const base64Payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(base64Payload));

        userEmail = decodedPayload.sub || 'email@exemplo.com';
        userName = decodedPayload.name || userEmail.split('@')[0] || 'Usuário';

      } catch (error) {
        console.error('Erro ao decodificar token:', error);
        userName = 'Usuário';
        userEmail = 'email@exemplo.com';
      }
    }

    const currentDate = new Date().toLocaleString('pt-BR');

    let y = 120;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações do Relatório', pageWidth / 2, y, { align: 'center' });

    y += 15;

    pdf.setFillColor(46, 60, 179);
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(1);
    pdf.roundedRect(30, y - 5, pageWidth - 60, 90, 8, 8, 'D');

    y += 15;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    const labelX = 40;
    const valueX = 90;
    const lineHeight = 12;

    // Nome
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nome:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(userName, valueX, y);
    y += lineHeight;

    // E-mail
    pdf.setFont('helvetica', 'bold');
    pdf.text('E-mail:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(userEmail, valueX, y);
    y += lineHeight;

    // Data de Geração
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data de Geração:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(currentDate, valueX, y);
    y += lineHeight;

    // Período
    pdf.setFont('helvetica', 'bold');
    pdf.text('Período Analisado:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${this.formatDate(options.startDate)} até ${this.formatDate(options.endDate)}`, valueX, y);
    y += lineHeight;
  
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Conteúdo do Relatório:', 40, y);

    y += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const sections = [];
    if (options.includeSummary) sections.push('- Resumo Financeiro');
    if (options.includeCharts) sections.push('- Gráficos e Análises');
    if (options.includeCategories) sections.push('- Top Categorias');
    if (options.includeTransactions) sections.push('- Lista de Transações');
    if (options.includePiggyBanks) sections.push('- Cofrinhos');

    sections.forEach(section => {
      pdf.text(section, 45, y);
      y += 8;
    });

    return y;
  }

  private async addFinancialSummary(pdf: jsPDF, summary: any, startY: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = startY;

    // Título da seção
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 60, 179);
    pdf.text('Resumo Financeiro', pageWidth / 2, y, { align: 'center' });

    y += 25;

    // Layout em grid como no dashboard - 2 cards em cima, 1 embaixo
    const cardWidth = 80;
    const cardHeight = 32;
    const cardSpacing = 15;
    const startX = (pageWidth - (cardWidth * 2 + cardSpacing)) / 2;

    // Card 1 - Total de Receitas (verde)
    this.drawDashboardCard(pdf, startX, y, cardWidth, cardHeight,
      'Total de Receitas', this.formatCurrency(summary.totalIncome),
      [40, 167, 69], '↗');

    // Card 2 - Total de Despesas (vermelho)
    this.drawDashboardCard(pdf, startX + cardWidth + cardSpacing, y, cardWidth, cardHeight,
      'Total de Despesas', this.formatCurrency(summary.totalExpense),
      [220, 53, 69], '↘');

    y += cardHeight + cardSpacing;

    // Card 3 - Saldo do Período (centralizado e maior)
    const balanceCardWidth = cardWidth * 2 + cardSpacing;
    const balanceColor = summary.balance >= 0 ? [40, 167, 69] : [220, 53, 69];

    this.drawDashboardCard(pdf, startX, y, balanceCardWidth, cardHeight + 8,
      'Saldo do Período', this.formatCurrency(summary.balance),
      balanceColor, '⚖', true);

    y += cardHeight + 20;

    // Informações adicionais - estilo dashboard
    const infoY = y;
    const leftX = startX;
    const rightX = startX + balanceCardWidth;

    pdf.setTextColor(108, 117, 125);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de Transações: ${summary.transactionCount}`, leftX, infoY);
    pdf.text(`${summary.period}`, rightX, infoY, { align: 'right' });

    return y + 15;
  }

  private drawDashboardCard(pdf: jsPDF, x: number, y: number, width: number, height: number,
    title: string, value: string, color: number[], icon: string, isBalance = false): void {

    // Card principal com fundo branco
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, height, 'F');

    // Sombra sutil (cinza bem claro)
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x + 1, y + 1, width, height, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, height, 'F');

    // Borda sutil
    pdf.setDrawColor(233, 236, 239);
    pdf.setLineWidth(0.5);
    pdf.rect(x, y, width, height, 'D');

    // Usar cor azul para o saldo, cor original para outros
    const cardColor = isBalance ? [46, 60, 179] : color;

    // Barra superior colorida
    pdf.setFillColor(cardColor[0], cardColor[1], cardColor[2]);
    pdf.rect(x, y, width, 3, 'F');

    // Título sem ícone
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(isBalance ? 13 : 12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + width / 2, y + 18, { align: 'center' });

    // Valor principal
    pdf.setTextColor(cardColor[0], cardColor[1], cardColor[2]);
    pdf.setFontSize(isBalance ? 18 : 16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, x + width / 2, y + height - 6, { align: 'center' });
  }

  private async addCharts(pdf: jsPDF, reportData: ReportData, startY: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = startY;

    // Título da seção
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 60, 179);
    pdf.text('Análises Gráficas', pageWidth / 2, y, { align: 'center' });
    y += 20;

    // Criar gráfico de linha (evolução mensal)
    const lineChartCanvas = await this.createLineChart(reportData.monthlyData);
    if (lineChartCanvas) {
      const lineChartImage = lineChartCanvas.toDataURL('image/png');
      pdf.addImage(lineChartImage, 'PNG', 20, y, 170, 80);
      y += 90;
    }

    // Verificar se precisa de nova página
    if (y > 200) {
      pdf.addPage();
      y = 20;
    }

    // Criar gráfico de barras (comparação de categorias)
    const barChartCanvas = await this.createBarChart(reportData.categoryData.expenses);
    if (barChartCanvas) {
      const barChartImage = barChartCanvas.toDataURL('image/png');
      pdf.addImage(barChartImage, 'PNG', 20, y, 170, 80);
      y += 90;
    }

    return y;
  }

  private async createLineChart(monthlyData: any[]): Promise<HTMLCanvasElement | null> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth();
    const displayMonths = months.slice(0, currentMonth + 1);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: displayMonths,
        datasets: [
          {
            label: 'Receitas',
            data: monthlyData.map(d => d.income || 0),
            borderColor: this.colors.success,
            backgroundColor: this.colors.success + '20',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Despesas',
            data: monthlyData.map(d => d.expense || 0),
            borderColor: this.colors.danger,
            backgroundColor: this.colors.danger + '20',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Evolução Mensal de Receitas e Despesas',
            font: {
              size: 16,
              weight: 'bold'
            },
            color: this.colors.dark
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => 'R$ ' + value.toLocaleString('pt-BR')
            }
          }
        }
      }
    };

    new Chart(ctx, config);

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    return canvas;
  }

  private async createBarChart(categoryData: any[]): Promise<HTMLCanvasElement | null> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const topCategories = categoryData.slice(0, 6);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topCategories.map(c => c.name),
        datasets: [{
          label: 'Gastos por Categoria',
          data: topCategories.map(c => c.total),
          backgroundColor: [
            this.colors.primary,
            this.colors.secondary,
            this.colors.info,
            this.colors.warning,
            this.colors.danger,
            this.colors.success
          ]
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribuição de Gastos por Categoria',
            font: {
              size: 16,
              weight: 'bold'
            },
            color: this.colors.dark
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => 'R$ ' + value.toLocaleString('pt-BR')
            }
          }
        }
      }
    };

    new Chart(ctx, config);

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    return canvas;
  }

  private addTopCategories(pdf: jsPDF, topCategories: any, startY: number): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = startY;

    // Título da seção
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 60, 179);
    pdf.text('Top Categorias', pageWidth / 2, y, { align: 'center' });
    y += 20;

    // Top Despesas
    if (topCategories.expenses.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(220, 53, 69);
      pdf.text('Maiores Despesas', 30, y);
      y += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 51, 51);

      topCategories.expenses.forEach((cat: any, index: number) => {
        const percentage = (cat.percentage || 0).toFixed(1);
        const text = `${index + 1}. ${cat.name}: ${this.formatCurrency(cat.total)} (${percentage}%)`;
        pdf.text(text, 35, y);

        // Barra de progresso
        const barWidth = 50;
        const barHeight = 3;
        pdf.setFillColor(220, 53, 69, 0.2);
        pdf.rect(120, y - 3, barWidth, barHeight, 'F');
        pdf.setFillColor(220, 53, 69);
        pdf.rect(120, y - 3, barWidth * (cat.percentage / 100), barHeight, 'F');

        y += 8;
      });
    }

    y += 10;

    // Top Receitas
    if (topCategories.incomes.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 167, 69);
      pdf.text('Maiores Receitas', 30, y);
      y += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 51, 51);

      topCategories.incomes.forEach((cat: any, index: number) => {
        const percentage = (cat.percentage || 0).toFixed(1);
        const text = `${index + 1}. ${cat.name}: ${this.formatCurrency(cat.total)} (${percentage}%)`;
        pdf.text(text, 35, y);

        // Barra de progresso
        const barWidth = 50;
        const barHeight = 3;
        pdf.setFillColor(40, 167, 69, 0.2);
        pdf.rect(120, y - 3, barWidth, barHeight, 'F');
        pdf.setFillColor(40, 167, 69);
        pdf.rect(120, y - 3, barWidth * (cat.percentage / 100), barHeight, 'F');

        y += 8;
      });
    }

    return y + 10;
  }

  private addTransactionsList(pdf: jsPDF, transactions: any[], startY: number): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = startY;

    // Título da seção
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 60, 179);
    pdf.text('Lista de Transações', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Cabeçalho da tabela
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(245, 245, 245);
    pdf.rect(20, y - 5, 170, 10, 'F');

    pdf.setTextColor(51, 51, 51);
    pdf.text('Data', 25, y);
    pdf.text('Descrição', 50, y);
    pdf.text('Categoria', 100, y);
    pdf.text('Tipo', 135, y);
    pdf.text('Valor', 160, y);

    y += 10;

    // Linhas da tabela
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    transactions.forEach((transaction, index) => {
      // Verificar se precisa de nova página
      if (y > 270) {
        pdf.addPage();
        y = 20;

        // Repetir cabeçalho
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(245, 245, 245);
        pdf.rect(20, y - 5, 170, 10, 'F');
        pdf.text('Data', 25, y);
        pdf.text('Descrição', 50, y);
        pdf.text('Categoria', 100, y);
        pdf.text('Tipo', 135, y);
        pdf.text('Valor', 160, y);
        pdf.setFont('helvetica', 'normal');
        y += 10;
      }

      // Alternar cor de fundo
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(20, y - 5, 170, 8, 'F');
      }

      pdf.setTextColor(51, 51, 51);
      pdf.text(this.formatDate(transaction.date), 25, y);

      // Truncar descrição se necessário
      const description = transaction.destination.length > 25
        ? transaction.destination.substring(0, 25) + '...'
        : transaction.destination;
      pdf.text(description, 50, y);

      const category = transaction.category?.name || 'Sem categoria';
      pdf.text(category.length > 15 ? category.substring(0, 15) + '...' : category, 100, y);

      // Tipo com cor
      if (transaction.type === 'INCOME') {
        pdf.setTextColor(40, 167, 69);
        pdf.text('Receita', 135, y);
      } else {
        pdf.setTextColor(220, 53, 69);
        pdf.text('Despesa', 135, y);
      }

      // Valor
      pdf.setTextColor(51, 51, 51);
      pdf.text(this.formatCurrency(transaction.amount), 160, y);

      y += 8;
    });

    return y + 10;
  }

  private addPiggyBanks(pdf: jsPDF, piggyBanks: any[], startY: number): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = startY;

    // Título da seção
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 60, 179);
    pdf.text('Cofrinhos', pageWidth / 2, y, { align: 'center' });

    // Linha decorativa
    pdf.setDrawColor(46, 60, 179);
    pdf.setLineWidth(2);
    const lineWidth = 30;

    y += 25;

    piggyBanks.forEach((piggyBank, index) => {
      // Verificar se precisa de nova página
      if (y > 220) {
        pdf.addPage();
        y = 30;
      }

      const cardX = 20;
      const cardWidth = pageWidth - 40;
      const cardHeight = 55;

      // Definir cores baseadas no status
      const progress = (piggyBank.currentAmount / piggyBank.savingsGoal) * 100;
      let borderColor;

      if (piggyBank.status === 'COMPLETED') {
        borderColor = [34, 197, 94]; // Verde
      } else if (piggyBank.status === 'BEHIND') {
        borderColor = [239, 68, 68]; // Vermelho
      } else {
        borderColor = [59, 130, 246]; // Azul
      }

      // Card simples com borda
      pdf.setFillColor(250, 250, 250);
      pdf.rect(cardX, y, cardWidth, cardHeight, 'F');

      pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdf.setLineWidth(1);
      pdf.rect(cardX, y, cardWidth, cardHeight, 'D');

      // Nome do cofrinho
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(51, 51, 51);
      pdf.text(piggyBank.name, cardX + 8, y + 12);

      // Status badge compacto
      const statusText = this.getStatusLabel(piggyBank.status);
      pdf.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
      pdf.setFontSize(9);
      pdf.text(`[${statusText}]`, cardX + cardWidth - 35, y + 12);

      // Valores em uma linha só
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${this.formatCurrency(piggyBank.currentAmount)} / ${this.formatCurrency(piggyBank.savingsGoal)} (${progress.toFixed(1)}%)`, cardX + 8, y + 22);

      // Barra de progresso compacta
      const progressBarY = y + 26;
      const progressBarWidth = cardWidth - 16;
      const progressBarHeight = 4;
      const progressBarX = cardX + 8;

      // Background da barra
      pdf.setFillColor(230, 230, 230);
      pdf.rect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 'F');

      // Progresso da barra
      const progressWidth = Math.min((progress / 100) * progressBarWidth, progressBarWidth);
      if (progressWidth > 0) {
        pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.rect(progressBarX, progressBarY, progressWidth, progressBarHeight, 'F');
      }

      y += cardHeight + 8;
    });

    return y + 10;
  }
  private addFooterToAllPages(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);

      // Linha divisória
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

      // Texto do rodapé
      pdf.setFontSize(9);
      pdf.setTextColor(108, 117, 125);
      pdf.setFont('helvetica', 'normal');

      // Numeração de página
      pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // FinPro no canto esquerdo
      pdf.text('FinPro - Sistema de Gestão Financeira', 20, pageHeight - 10);

      // Data no canto direito
      const currentDate = new Date().toLocaleDateString('pt-BR');
      pdf.text(currentDate, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  }

  // Métodos auxiliares
  private groupByCategory(transactions: any[]): any[] {
    const grouped = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Sem categoria';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          total: 0,
          count: 0,
          transactions: []
        };
      }
      acc[categoryName].total += transaction.amount;
      acc[categoryName].count++;
      acc[categoryName].transactions.push(transaction);
      return acc;
    }, {});

    const result = Object.values(grouped) as any[];

    // Calcular porcentagens
    const total = result.reduce((sum, cat) => sum + cat.total, 0);
    result.forEach(cat => {
      cat.percentage = total > 0 ? (cat.total / total) * 100 : 0;
    });

    // Ordenar por valor total
    return result.sort((a, b) => b.total - a.total);
  }

  private mergeMonthlyData(expenses: any[], incomes: any[]): any[] {
    const merged: any[] = [];

    for (let month = 1; month <= 12; month++) {
      const expense = expenses.find(e => e.month === month);
      const income = incomes.find(i => i.month === month);

      merged.push({
        month,
        expense: expense?.total || 0,
        income: income?.total || 0,
        balance: (income?.total || 0) - (expense?.total || 0)
      });
    }

    return merged;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'ON_TRACK': return 'No prazo';
      case 'BEHIND': return 'Atrasado';
      case 'COMPLETED': return 'Concluído';
      default: return status;
    }
  }
}
