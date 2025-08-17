import { Component, inject, OnInit, HostListener } from '@angular/core';
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
  loading = false;
  errorMessage = '';
  activeTab = 'despesas';
  showCustomDateRange = false;
  selectedPeriod = ''; // Default: Todas as transações

  // Propriedades para o dropdown de categorias
  showCategoryDropdown = false;
  selectedCategoryName = '';
  newCategoryName = '';
  creatingCategory = false;
  categoryError = '';

  // Propriedades para o modal de transação
  showTransactionModal = false;
  selectedTransaction: ExpenseResponse | null = null;

  // Propriedades para edição
  isEditing = false;
  editingExpenseId: number | null = null;

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
    expenseCategoryId: ['', [Validators.required]],
    paymentDestination: ['', [Validators.required]],
    balanceSource: ['', [Validators.required]],
    observation: ['']
  });

  // Fechar dropdown ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-dropdown')) {
      this.showCategoryDropdown = false;
    }
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
    this.setDefaultDateRange();
  }

  private setDefaultDateRange() {
    // Não definir datas por padrão para mostrar todas as transações
    this.filters.startDate = '';
    this.filters.endDate = '';
    this.selectedPeriod = ''; // Definir como "Todas" por padrão
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

  // Métodos para o dropdown de categorias
  toggleCategoryDropdown() {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.categoryError = '';
  }

  selectCategory(category: ExpenseCategory) {
    this.expenseForm.get('expenseCategoryId')?.setValue(category.expenseCategoryId);
    this.selectedCategoryName = category.name;
    this.showCategoryDropdown = false;
    this.categoryError = '';
  }

  async createNewCategory() {
    if (!this.newCategoryName || this.newCategoryName.trim().length === 0) {
      this.categoryError = 'Nome da categoria é obrigatório';
      return;
    }

    // Verificar se já existe categoria com este nome
    const existingCategory = this.categories.find(
      cat => cat.name.toLowerCase().trim() === this.newCategoryName.toLowerCase().trim()
    );

    if (existingCategory) {
      this.categoryError = 'Já existe uma categoria com este nome';
      return;
    }

    // Validar comprimento
    if (this.newCategoryName.trim().length < 2) {
      this.categoryError = 'Nome da categoria deve ter pelo menos 2 caracteres';
      return;
    }

    if (this.newCategoryName.trim().length > 50) {
      this.categoryError = 'Nome da categoria deve ter no máximo 50 caracteres';
      return;
    }

    this.creatingCategory = true;
    this.categoryError = '';

    try {
      const newCategory = await this.expenseService.createCategory({ 
        name: this.newCategoryName.trim() 
      });
      
      // Atualizar lista de categorias
      await this.loadCategories();
      
      // Selecionar a nova categoria
      this.selectCategory(newCategory);
      
      // Limpar input
      this.newCategoryName = '';
      
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      this.categoryError = error.message || 'Erro ao criar categoria';
    } finally {
      this.creatingCategory = false;
    }
  }

  async onSubmit() {
    if (this.expenseForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const categoryId = this.expenseForm.get('expenseCategoryId')?.value;

        if (!categoryId) {
          this.errorMessage = 'Selecione uma categoria';
          this.loading = false;
          return;
        }

        const expenseData: Expense = {
          date: this.expenseForm.get('date')?.value,
          amount: this.expenseForm.get('amount')?.value,
          expenseCategoryId: categoryId,
          paymentDestination: this.expenseForm.get('paymentDestination')?.value,
          balanceSource: this.expenseForm.get('balanceSource')?.value,
          observation: this.expenseForm.get('observation')?.value || undefined
        };

        if (this.isEditing && this.editingExpenseId) {
          // Atualizar despesa existente
          await this.expenseService.updateExpense(this.editingExpenseId, expenseData);
          console.log('Despesa atualizada com sucesso');
        } else {
          // Criar nova despesa
          await this.expenseService.createExpense(expenseData);
          console.log('Despesa criada com sucesso');
        }
        
        // Recarrega os dados
        await this.loadExpenses();
        this.updateUniqueAccounts();
        this.applyFilters();
        
        // Reset do formulário
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao salvar despesa:', error);
        this.errorMessage = error.message || 'Erro ao salvar despesa';
      } finally {
        this.loading = false;
      }
    } else {
      this.expenseForm.markAllAsTouched();
    }
  }

  resetForm() {
    this.expenseForm.reset({
      date: this.getCurrentDate()
    });
    this.errorMessage = '';
    this.selectedCategoryName = '';
    this.newCategoryName = '';
    this.categoryError = '';
    this.showCategoryDropdown = false;
    
    // Reset edição
    this.isEditing = false;
    this.editingExpenseId = null;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.applyFilters();
  }

  clearAllFilters() {
    // Resetar todos os filtros
    this.filters = {
      startDate: '',
      endDate: '',
      category: '',
      account: '',
      searchTerm: ''
    };
    
    // Resetar controles de período
    this.selectedPeriod = '';
    this.showCustomDateRange = false;
    
    // Aplicar filtros (vai mostrar todas as transações)
    this.applyFilters();
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    this.showCustomDateRange = period === 'custom';
    
    if (period === '') {
      // Todas as transações - limpar filtros de data
      this.filters.startDate = '';
      this.filters.endDate = '';
    } else if (period !== 'custom') {
      // Período específico
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      this.filters.startDate = startDate.toISOString().split('T')[0];
      this.filters.endDate = endDate.toISOString().split('T')[0];
    }
    
    this.applyFilters();
  }

  updateFilter(filterType: string, value: any) {
    switch (filterType) {
      case 'period':
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
      case 'startDate':
      case 'endDate':
        if (this.selectedPeriod === 'custom') {
          this.applyFilters();
        }
        break;
    }
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.expenses];

    // Filtro por datas (só aplicar se houver datas definidas)
    if (this.filters.startDate && this.filters.endDate) {
      const startDate = new Date(this.filters.startDate);
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Fim do dia

      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

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

  // Métodos para o modal de transação
  openTransactionModal(transaction: ExpenseResponse) {
    this.selectedTransaction = transaction;
    this.showTransactionModal = true;
  }

  closeTransactionModal() {
    this.showTransactionModal = false;
    this.selectedTransaction = null;
  }

  editExpenseFromModal() {
    if (this.selectedTransaction) {
      this.editExpense(this.selectedTransaction);
      this.closeTransactionModal();
    }
  }

  async deleteExpenseFromModal() {
    if (this.selectedTransaction && confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await this.expenseService.deleteExpense(this.selectedTransaction.expenseId);
        await this.loadExpenses();
        this.updateUniqueAccounts();
        this.applyFilters();
        this.closeTransactionModal();
      } catch (error: any) {
        console.error('Erro ao deletar despesa:', error);
        alert(error.message || 'Erro ao deletar despesa');
      }
    }
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
    // Preencher o formulário com os dados da despesa
    this.expenseForm.patchValue({
      date: expense.date,
      amount: expense.amount,
      expenseCategoryId: expense.category?.expenseCategoryId || '',
      paymentDestination: expense.paymentDestination,
      balanceSource: expense.balanceSource,
      observation: expense.observation || ''
    });

    // Definir categoria selecionada no dropdown
    if (expense.category) {
      this.selectedCategoryName = expense.category.name;
    }

    // Configurar modo de edição
    this.isEditing = true;
    this.editingExpenseId = expense.expenseId;
    
    // Mostrar formulário
    this.showForm = true;
    
    // Limpar erros
    this.errorMessage = '';
    
    console.log('Editando despesa:', expense);
  }

getCurrentDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // Mês começa em 0
  const day = today.getDate();
  
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

formatDate(dateString: string): string {
  if (dateString.includes('T')) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
}
  
formatCurrency(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }
}
