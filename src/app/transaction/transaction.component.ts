import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TransactionService } from './transaction.service';
import { UnifiedTransaction, TransactionType } from '../entity/transaction';

interface FilterOptions {
search: any;
  startDate: string;
  endDate: string;
  category: string;
  account: string;
  searchTerm: string;
}

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css']
})
export class TransactionComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);

  // Dados unificados
  allTransactions: UnifiedTransaction[] = [];
  filteredTransactions: UnifiedTransaction[] = [];
  
  // Categorias por tipo
  expenseCategories: any[] = [];
  incomeCategories: any[] = [];
  
  // Listas únicas para filtros
  uniqueAccounts: string[] = [];
  uniqueCategories: string[] = [];
  
  // Estado do formulário 
  showForm = false;
  loading = false;
  errorMessage = '';
  activeTab = 'todas';
  
  // Estado do formulário 
  transactionType: TransactionType = 'EXPENSE';
  creatingNewCategory = false;
  isCreatingCategory = false;
  showCategorySuggestions = false;
  filteredCurrentCategories: any[] = [];

  filters: FilterOptions = {
    search: '',
    startDate: '',
    endDate: '',
    category: '',
    account: '',
    searchTerm: ''  
  };

  // Formulário unificado 
  transactionForm: FormGroup = this.fb.group({
    date: [this.getCurrentDate(), [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    categoryId: [''],
    categoryInput: ['', [Validators.required]], // Campo de input para categoria (do income)
    newCategoryName: [''],
    destination: ['', [Validators.required]], // paymentDestination ou paymentOrigin
    account: ['', [Validators.required]], // balanceSource
    observation: ['']
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
    this.setupCategoryInputListener();
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadAllTransactions(),
        this.loadCategories()
      ]);
      this.updateUniqueFilters();
      this.applyFilters();
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      this.errorMessage = error.message || 'Erro ao carregar dados';
    }
  }

  async loadAllTransactions() {
    this.allTransactions = await this.transactionService.getAllTransactions();
  }

  async loadCategories() {
    [this.expenseCategories, this.incomeCategories] = await Promise.all([
      this.transactionService.getCategoriesByType('EXPENSE'),
      this.transactionService.getCategoriesByType('INCOME')
    ]);
    this.updateFilteredCategories();
  }

  updateUniqueFilters() {
    this.uniqueAccounts = this.transactionService.getUniqueAccounts(this.allTransactions);
    this.uniqueCategories = this.transactionService.getUniqueCategories(this.allTransactions);
  }

  // =================== FORMULÁRIO ===================
  
  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  onTransactionTypeChange(type: TransactionType) {
    this.transactionType = type;
    this.updateFilteredCategories();
    this.resetCategoryField();
    this.updateFormLabels();
  }

  updateFormLabels() {
    // Atualizar placeholders e labels dinamicamente baseado no tipo
    const destinationControl = this.transactionForm.get('destination');
    if (this.transactionType === 'INCOME') {
      destinationControl?.setValue('');
    } else {
      destinationControl?.setValue('');
    }
  }

  // =================== CATEGORIAS DINÂMICAS (do Income) ===================
  
  private setupCategoryInputListener() {
    const categoryControl = this.transactionForm.get('categoryInput');
    
    categoryControl?.valueChanges.subscribe(value => {
      if (typeof value === 'string') {
        this.filterCategories(value);
        
        // Resetar categoria selecionada se o usuário está digitando
        if (this.transactionForm.get('categoryId')?.value) {
          this.transactionForm.patchValue({ categoryId: null });
        }
      }
    });
  }

  private filterCategories(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredCurrentCategories = this.getCurrentCategories();
      this.showCategorySuggestions = false;
      return;
    }

    this.filteredCurrentCategories = this.getCurrentCategories().filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.showCategorySuggestions = true;
  }

  updateFilteredCategories() {
    this.filteredCurrentCategories = this.getCurrentCategories();
  }

  getCurrentCategories() {
    return this.transactionType === 'INCOME' 
      ? this.incomeCategories 
      : this.expenseCategories;
  }

  getCurrentCategoryIdField() {
    return this.transactionType === 'INCOME' 
      ? 'incomeCategoryId' 
      : 'expenseCategoryId';
  }

  selectCategory(category: any) {
    const categoryId = this.transactionType === 'INCOME' 
      ? category.incomeCategoryId 
      : category.expenseCategoryId;
      
    this.transactionForm.patchValue({
      categoryInput: category.name,
      categoryId: categoryId
    });
    this.showCategorySuggestions = false;
  }

  onCategoryInputFocus() {
    if (this.filteredCurrentCategories.length > 0) {
      this.showCategorySuggestions = true;
    }
  }

  onCategoryInputBlur() {
    // Delay para permitir clique nas sugestões
    setTimeout(() => {
      this.showCategorySuggestions = false;
    }, 200);
  }

  resetCategoryField() {
    this.transactionForm.patchValue({
      categoryInput: '',
      categoryId: null
    });
    this.creatingNewCategory = false;
    this.showCategorySuggestions = false;
  }

  // =================== SUBMIT (híbrido) ===================

  async onSubmit() {
    if (this.transactionForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.transactionForm.value;
        let categoryId = formData.categoryId;

        // Se não há categoria selecionada, criar nova (lógica do income)
        if (!categoryId && formData.categoryInput?.trim()) {
          this.isCreatingCategory = true;
          console.log(' Criando nova categoria:', formData.categoryInput);
          
          const newCategory = await this.transactionService.createCategory(
            this.transactionType,
            formData.categoryInput.trim()
          );
          
          categoryId = this.transactionType === 'INCOME' 
            ? newCategory.incomeCategoryId 
            : newCategory.expenseCategoryId;
          
          // Atualizar lista de categorias
          await this.loadCategories();
          
          console.log('Categoria obtida/criada com ID:', categoryId);
          this.isCreatingCategory = false;
        }

        if (!categoryId) {
          throw new Error('Categoria é obrigatória');
        }

        // Preparar dados baseado no tipo
        const transactionData = this.prepareTransactionData(formData, categoryId);

        console.log('Dados da transação sendo enviados:', transactionData);

        await this.transactionService.createTransaction(this.transactionType, transactionData);
        
        // Recarregar dados
        await this.loadAllTransactions();
        this.updateUniqueFilters();
        this.applyFilters();
        
        // Reset do formulário
        this.resetForm();
        this.showForm = false;

        console.log(`${this.transactionType === 'INCOME' ? 'Receita' : 'Despesa'} criada com sucesso`);

      } catch (error: any) {
        console.error('Erro ao salvar transação:', error);
        this.errorMessage = error.message || 'Erro ao salvar transação';
        this.isCreatingCategory = false;
      } finally {
        this.loading = false;
      }
    } else {
      this.transactionForm.markAllAsTouched();
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios';
    }
  }

  private prepareTransactionData(formData: any, categoryId: number) {
    const baseData = {
      date: formData.date,
      amount: Number(formData.amount),
      balanceSource: formData.account.trim(),
      observation: formData.observation?.trim() || undefined
    };

    if (this.transactionType === 'INCOME') {
      return {
        ...baseData,
        paymentOrigin: formData.destination.trim(),
        incomeCategoryId: categoryId
      };
    } else {
      return {
        ...baseData,
        paymentDestination: formData.destination.trim(),
        expenseCategoryId: categoryId
      };
    }
  }

  resetForm() {
    this.transactionForm.reset({
      date: this.getCurrentDate()
    });
    this.transactionType = 'EXPENSE';
    this.creatingNewCategory = false;
    this.isCreatingCategory = false;
    this.showCategorySuggestions = false;
    this.errorMessage = '';
    
    const today = new Date().toISOString().split('T')[0];
    this.transactionForm.patchValue({ date: today });
    
    this.updateFilteredCategories();
  }

  // =================== FILTROS (do Expense) ===================

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
    let filtered = [...this.allTransactions];

    // Filtro por tipo (abas)
    if (this.activeTab === 'receitas') {
      filtered = filtered.filter(t => t.type === 'INCOME');
    } else if (this.activeTab === 'despesas') {
      filtered = filtered.filter(t => t.type === 'EXPENSE');
    }
    // 'todas' mostra tudo

    // Filtro por categoria
    if (this.filters.category) {
      filtered = filtered.filter(t => 
        t.category?.name === this.filters.category
      );
    }

     // Filtro por período
  if (this.filters.startDate && this.filters.endDate) {
    const startDate = new Date(this.filters.startDate);
    const endDate = new Date(this.filters.endDate);
    
    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

    // Filtro por conta
    if (this.filters.account) {
      filtered = filtered.filter(t => 
        t.account === this.filters.account
      );
    }

    // Filtro por busca
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.destination.toLowerCase().includes(searchTerm) ||
        t.account.toLowerCase().includes(searchTerm) ||
        (t.observation && t.observation.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredTransactions = filtered;
  }

  // =================== AÇÕES (do Expense) ===================

  async deleteTransaction(transaction: UnifiedTransaction) {
    if (confirm(`Tem certeza que deseja excluir esta ${transaction.type === 'INCOME' ? 'receita' : 'despesa'}?`)) {
      try {
        await this.transactionService.deleteTransaction(transaction.type, transaction.id);
        await this.loadAllTransactions();
        this.updateUniqueFilters();
        this.applyFilters();
      } catch (error: any) {
        console.error('Erro ao deletar transação:', error);
        alert(error.message || 'Erro ao deletar transação');
      }
    }
  }

editTransaction(transaction: UnifiedTransaction) {
  this.showForm = true;
  this.transactionType = transaction.type;
  
  // Preencher formulário com dados da transação
  this.transactionForm.patchValue({
    date: transaction.date.split('T')[0], // Formato YYYY-MM-DD
    amount: transaction.amount,
    categoryInput: transaction.category?.name || '',
    destination: transaction.destination,
    account: transaction.account,
    observation: transaction.observation || ''
  });

  // Setar ID da categoria se existir
  if (transaction.category) {
    this.transactionForm.patchValue({
      categoryId: transaction.category.id
    });
  }
  
  // Atualizar status da categoria
  this.updateFilteredCategories();
}


  // =================== HELPERS (do Expense) ===================

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

  // Status da categoria (do income)
  get categoryStatus(): string {
    const categoryInput = this.transactionForm.get('categoryInput')?.value;
    const selectedCategoryId = this.transactionForm.get('categoryId')?.value;

    if (!categoryInput?.trim()) {
      return '';
    }

    if (selectedCategoryId) {
      return 'Categoria existente selecionada';
    }

    if (this.isCreatingCategory) {
      return 'Criando nova categoria...';
    }

    const existingCategory = this.getCurrentCategories().find(cat =>
      cat.name.toLowerCase() === categoryInput.toLowerCase().trim()
    );

    if (existingCategory) {
      return 'Categoria encontrada';
    }

    return 'Nova categoria será criada';
  }
}