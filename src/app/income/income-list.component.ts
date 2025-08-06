import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncomeFormComponent } from './income-form.component';
import { IncomeService } from './income.service';
import { Income } from '../entity/income';

// Interface para a resposta da API que inclui informações da categoria
interface IncomeResponse {
  incomeId: number;
  date: string;
  amount: number;
  paymentOrigin: string;
  balanceSource: string;
  observation?: string;
  userId: number;
  category?: {
    incomeCategoryId: number;
    name: string;
  };
}

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IncomeFormComponent],
  templateUrl: './income-list.component.html',
  styleUrls: ['./income-list.component.css']
})
export class IncomeListComponent implements OnInit {
  private incomeService = inject(IncomeService);

  incomes: IncomeResponse[] = [];
  loading = false;
  errorMessage = '';
  
  // Form
  showForm = false;
  isEditMode = false;
  selectedIncome?: Income;

  ngOnInit() {
    this.loadIncomes();
  }

  async loadIncomes() {
    this.loading = true;
    this.errorMessage = '';

    try {
      console.log('Carregando receitas...');
      const response = await this.incomeService.getAllIncomes();
      
      // A resposta da API já vem com as informações da categoria
      this.incomes = response as IncomeResponse[];
      
      console.log('Receitas carregadas:', this.incomes);
    } catch (error: any) {
      console.error('Erro ao carregar receitas:', error);
      this.errorMessage = error.message || 'Erro ao carregar receitas';
    } finally {
      this.loading = false;
    }
  }

  showCreateForm() {
    this.isEditMode = false;
    this.selectedIncome = undefined;
    this.showForm = true;
  }

  editIncome(income: IncomeResponse) {
    this.isEditMode = true;
    
    this.selectedIncome = {
      incomeId: income.incomeId,
      date: income.date,
      amount: income.amount,
      paymentOrigin: income.paymentOrigin,
      balanceSource: income.balanceSource,
      observation: income.observation,
      incomeCategoryId: income.category?.incomeCategoryId || 1,
      userId: income.userId
    };
    
    this.showForm = true;
  }

  async deleteIncome(id: number) {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        console.log('🗑️ Deletando receita:', id);
        await this.incomeService.deleteIncome(id);
        console.log('✅ Receita deletada com sucesso');
        await this.loadIncomes();
      } catch (error: any) {
        console.error('❌ Erro ao deletar receita:', error);
        this.errorMessage = error.message || 'Erro ao deletar receita';
      }
    }
  }

  onFormSubmit() {
    this.showForm = false;
    this.loadIncomes();
  }

  onFormCancel() {
    this.showForm = false;
    this.selectedIncome = undefined;
  }

  getTotalAmount(): number {
    return this.incomes.reduce((total, income) => total + (income.amount || 0), 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  getCategoryName(income: IncomeResponse): string {
    return income.category?.name || 'Sem categoria';
  }
}