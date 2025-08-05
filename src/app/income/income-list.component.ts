import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncomeFormComponent } from './income-form.component'; // Importar o componente de formulário
import { IncomeService } from './income.service';
import { Income } from '../entity/income';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IncomeFormComponent],
  templateUrl: './income-list.component.html',
  styleUrls: ['./income-list.component.css']
})
export class IncomeListComponent implements OnInit {
  private incomeService = inject(IncomeService);

  incomes: Income[] = [];
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
      this.incomes = await this.incomeService.getAllIncomes();
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.loading = false;
    }
  }

  showCreateForm() {
    this.isEditMode = false;
    this.selectedIncome = undefined;
    this.showForm = true;
  }

  editIncome(income: Income) {
    this.isEditMode = true;
    this.selectedIncome = income;
    this.showForm = true;
  }

  async deleteIncome(id: number) {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        await this.incomeService.deleteIncome(id);
        await this.loadIncomes();
      } catch (error: any) {
        this.errorMessage = error.message;
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
}