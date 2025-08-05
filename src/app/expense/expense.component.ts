import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExpenseService } from './expense.service';
import { Expense, ExpenseResponse, ExpenseCategory } from '../entity/expense';

interface FilterOptions {
  startDate: string;
  endDate: string;
  category: string;
  account: string;
  searchTerm: string;
}

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.css']
})
export class ExpenseComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);

  expenses: ExpenseResponse[] = [];
  filteredExpenses: ExpenseResponse[] = [];
  categories: ExpenseCategory[] = [];
  uniqueAccounts: string[] = [];
  
  showForm = false;
  creatingNewCategory = false;
  loading = false;
  errorMessage = '';
  activeTab = 'despesas';

  filters: FilterOptions = {
    startDate: '',
    endDate: '',
    category: '',
    account: '',
    searchTerm: ''
  };

  expenseForm: FormGroup = this.fb.group({
    date: [this.getCurrentDate(), [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    expenseCategoryId: ['', [Validators.required]], // Obrigatório por padrão
    newCategoryName: [''],
    paymentDestination: ['', [Validators.required]],
    balanceSource: ['', [Validators.required]],
    observation: ['']
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadExpenses(),
        this.loadCategories()
      ]);
      this.updateUniqueAccounts();
      this.applyFilters();
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      this.errorMessage = error.message || 'Erro ao carregar dados';
    }
  }

  async loadExpenses() {
    this.expenses = await this.expenseService.getAllExpenses();
  }

  async loadCategories() {
    this.categories = await this.expenseService.getAllCategories();
  }

  updateUniqueAccounts() {
    const accounts = this.expenses.map(expense => expense.balanceSource);
    this.uniqueAccounts = [...new Set(accounts)].filter(Boolean);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  toggleNewCategory() {
    this.creatingNewCategory = !this.creatingNewCategory;
    
    if (this.creatingNewCategory) {
      // Limpa a categoria selecionada e foca na criação de nova
      this.expenseForm.get('expenseCategoryId')?.setValue('');
      this.expenseForm.get('newCategoryName')?.setValidators([Validators.required]);
      this.expenseForm.get('expenseCategoryId')?.clearValidators();
    } else {
      // Volta para seleção de categoria existente
      this.expenseForm.get('newCategoryName')?.setValue('');
      this.expenseForm.get('newCategoryName')?.clearValidators();
      this.expenseForm.get('expenseCategoryId')?.setValidators([Validators.required]);
    }
    
    // Atualiza as validações
    this.expenseForm.get('newCategoryName')?.updateValueAndValidity();
    this.expenseForm.get('expenseCategoryId')?.updateValueAndValidity();
    
    // Limpa mensagem de erro
    this.errorMessage = '';
  }

  async onSubmit() {
    if (this.expenseForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        let categoryId = this.expenseForm.get('expenseCategoryId')?.value;

        // Se está criando nova categoria
        if (this.creatingNewCategory) {
          const newCategoryName = this.expenseForm.get('newCategoryName')?.value;
          if (newCategoryName) {
            const newCategory = await this.expenseService.createCategory({ name: newCategoryName });
            categoryId = newCategory.expenseCategoryId;
            // Atualiza a lista de categorias
            await this.loadCategories();
          }
        }

        // Validação: se não tem categoria e não está criando nova, não pode salvar
        if (!categoryId && !this.creatingNewCategory) {
          this.errorMessage = 'Selecione uma categoria ou crie uma nova';
          this.loading = false;
          return;
        }

        const expenseData: Expense = {
          date: this.expenseForm.get('date')?.value,
          amount: this.expenseForm.get('amount')?.value,
          expenseCategoryId: categoryId || undefined,
          paymentDestination: this.expenseForm.get('paymentDestination')?.value,
          balanceSource: this.expenseForm.get('balanceSource')?.value,
          observation: this.expenseForm.get('observation')?.value || undefined
        };

        await this.expenseService.createExpense(expenseData);
        
        // Recarrega os dados
        await this.loadExpenses();
        this.updateUniqueAccounts();
        this.applyFilters();
        
        // Reset do formulário
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao criar despesa:', error);
        this.errorMessage = error.message || 'Erro ao criar despesa';
      } finally {
        this.loading = false;
      }
    } else {
      // Marcar todos os campos como touched para mostrar erros
      this.expenseForm.markAllAsTouched();
      
      // Se está criando nova categoria mas o campo está vazio
      if (this.creatingNewCategory && !this.expenseForm.get('newCategoryName')?.value) {
        this.errorMessage = 'Digite o nome da nova categoria';
      } else if (!this.creatingNewCategory && !this.expenseForm.get('expenseCategoryId')?.value) {
        this.errorMessage = 'Selecione uma categoria ou crie uma nova';
      }
    }
  }

  resetForm() {
    this.expenseForm.reset({
      date: this.getCurrentDate()
    });
    this.creatingNewCategory = false;
    this.errorMessage = '';
    
    // Restaura validações padrão (categoria obrigatória)
    this.expenseForm.get('expenseCategoryId')?.setValidators([Validators.required]);
    this.expenseForm.get('newCategoryName')?.clearValidators();
    this.expenseForm.get('expenseCategoryId')?.updateValueAndValidity();
    this.expenseForm.get('newCategoryName')?.updateValueAndValidity();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.applyFilters();
  }

  updateFilter(filterType: string, value: any) {
    switch (filterType) {
      case 'period':
        // Implementar lógica de período
        break;
      case 'category':
        this.filters.category = value;
        break;
      case 'account':
        this.filters.account = value;
        break;
      case 'searchTerm':
        this.filters.searchTerm = value;
        break;
    }
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.expenses];

    // Filtro por categoria
    if (this.filters.category) {
      filtered = filtered.filter(expense => 
        expense.category?.name === this.filters.category
      );
    }

    // Filtro por conta
    if (this.filters.account) {
      filtered = filtered.filter(expense => 
        expense.balanceSource === this.filters.account
      );
    }

    // Filtro por busca
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.paymentDestination.toLowerCase().includes(searchTerm) ||
        expense.balanceSource.toLowerCase().includes(searchTerm) ||
        (expense.observation && expense.observation.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredExpenses = filtered;
  }

  async deleteExpense(expenseId: number) {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await this.expenseService.deleteExpense(expenseId);
        await this.loadExpenses();
        this.updateUniqueAccounts();
        this.applyFilters();
      } catch (error: any) {
        console.error('Erro ao deletar despesa:', error);
        alert(error.message || 'Erro ao deletar despesa');
      }
    }
  }

  editExpense(expense: ExpenseResponse) {
    // Implementar edição
    console.log('Editar despesa:', expense);
  }

  getCurrentDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatCurrency(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }
}