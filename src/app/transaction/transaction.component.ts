import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TransactionService } from './transaction.service';
import { UnifiedTransaction, TransactionType } from '../entity/transaction';

interface FilterOptions {
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

  // Estado geral
  showForm = false;
  loading = false;
  errorMessage = '';
  activeTab = 'todas';
  showCustomDateRange = false;
  selectedPeriod = ''; // Default: Todas as transações

  // Estado do formulário 
  transactionType: TransactionType = 'EXPENSE';

  // Estado de edição
  isEditing = false;
  editingTransactionId: number | null = null;

  // Propriedades para o dropdown de categorias
  showCategoryDropdown = false;
  selectedCategoryName = '';
  newCategoryName = '';
  creatingCategory = false;
  categoryError = '';

  // Propriedades para o modal de transação
  showTransactionModal = false;
  selectedTransaction: UnifiedTransaction | null = null;

  filters: FilterOptions = {
    startDate: '',
    endDate: '',
    category: '',
    account: '',
    searchTerm: ''
  };

  // Formulário 
  transactionForm: FormGroup = this.fb.group({
    date: [this.getCurrentDate(), [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    categoryId: ['', [Validators.required]],
    destination: ['', [Validators.required]],
    account: ['', [Validators.required]],
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
    this.filters.startDate = '';
    this.filters.endDate = '';
    this.selectedPeriod = '';
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

  // NOVO: Método melhorado para mudança de tipo
  onTransactionTypeChange(type: TransactionType) {
    if (this.isEditing) return; // Não permitir mudança durante edição

    this.transactionType = type;
    this.resetCategoryField();

    // Atualizar a validação do radio button
    this.transactionForm.patchValue({
      // Força a atualização do estado do formulário
    });

    console.log('Tipo de transação alterado para:', type);
  }

  // =================== CATEGORIAS DROPDOWN ===================

  getCurrentCategories() {
    return this.transactionType === 'INCOME'
      ? this.incomeCategories
      : this.expenseCategories;
  }

  toggleCategoryDropdown() {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.categoryError = '';
  }

  selectCategory(category: any) {
    const categoryId = this.transactionType === 'INCOME'
      ? category.incomeCategoryId
      : category.expenseCategoryId;

    this.transactionForm.get('categoryId')?.setValue(categoryId);
    this.selectedCategoryName = category.name;
    this.showCategoryDropdown = false;
    this.categoryError = '';

    console.log('Categoria selecionada:', category.name, 'ID:', categoryId);
  }

  async createNewCategory() {
    if (!this.newCategoryName || this.newCategoryName.trim().length === 0) {
      this.categoryError = 'Nome da categoria é obrigatório';
      return;
    }

    // Verificar se já existe categoria com este nome
    const existingCategory = this.getCurrentCategories().find(
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
      console.log('Criando nova categoria:', this.newCategoryName.trim(), 'para tipo:', this.transactionType);

      const newCategory = await this.transactionService.createCategory(
        this.transactionType,
        this.newCategoryName.trim()
      );

      // Atualizar lista de categorias
      await this.loadCategories();

      // Selecionar a nova categoria
      this.selectCategory(newCategory);

      // Limpar input
      this.newCategoryName = '';

      console.log('Nova categoria criada com sucesso:', newCategory);

    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      this.categoryError = error.message || 'Erro ao criar categoria';
    } finally {
      this.creatingCategory = false;
    }
  }

  resetCategoryField() {
    this.transactionForm.patchValue({
      categoryId: ''
    });
    this.selectedCategoryName = '';
    this.newCategoryName = '';
    this.categoryError = '';
    this.showCategoryDropdown = false;
  }

  // =================== SUBMIT ===================

  async onSubmit() {
    if (this.transactionForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.transactionForm.value;
        const categoryId = formData.categoryId;

        if (!categoryId) {
          this.errorMessage = 'Selecione uma categoria';
          this.loading = false;
          return;
        }

        // Preparar dados baseado no tipo
        const transactionData = this.prepareTransactionData(formData, categoryId);

        console.log('Salvando transação:', {
          tipo: this.transactionType,
          dados: transactionData,
          edicao: this.isEditing
        });

        if (this.isEditing && this.editingTransactionId) {
          // Atualizar transação existente
          await this.transactionService.updateTransaction(
            this.transactionType,
            this.editingTransactionId,
            transactionData
          );
          console.log('Transação atualizada com sucesso');
        } else {
          // Criar nova transação
          await this.transactionService.createTransaction(this.transactionType, transactionData);
          console.log('Nova transação criada com sucesso');
        }

        // Recarregar dados
        await this.loadAllTransactions();
        this.updateUniqueFilters();
        this.applyFilters();

        // Reset do formulário e fechar
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao salvar transação:', error);
        this.errorMessage = error.message || 'Erro ao salvar transação';
      } finally {
        this.loading = false;
      }
    } else {
      this.transactionForm.markAllAsTouched();
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios';
      console.log('Formulário inválido:', this.transactionForm.errors);
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
    this.errorMessage = '';
    this.selectedCategoryName = '';
    this.newCategoryName = '';
    this.categoryError = '';
    this.showCategoryDropdown = false;

    // Reset do estado de edição
    this.isEditing = false;
    this.editingTransactionId = null;

    console.log('Formulário resetado');
  }

  // =================== FILTROS E ABAS ===================

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.applyFilters();
    console.log('Aba ativa alterada para:', tab);
  }

  clearAllFilters() {
    this.filters = {
      startDate: '',
      endDate: '',
      category: '',
      account: '',
      searchTerm: ''
    };

    this.selectedPeriod = '';
    this.showCustomDateRange = false;
    this.applyFilters();

    console.log('Todos os filtros foram limpos');
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    this.showCustomDateRange = period === 'custom';

    if (period === '') {
      this.filters.startDate = '';
      this.filters.endDate = '';
    } else if (period !== 'custom') {
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      this.filters.startDate = startDate.toISOString().split('T')[0];
      this.filters.endDate = endDate.toISOString().split('T')[0];
    }

    this.applyFilters();
    console.log('Período alterado:', period);
  }

  updateFilter(filterType: string, value: any) {
    switch (filterType) {
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
    let filtered = [...this.allTransactions];

    // Filtro por tipo (abas)
    if (this.activeTab === 'receitas') {
      filtered = filtered.filter(t => t.type === 'INCOME');
    } else if (this.activeTab === 'despesas') {
      filtered = filtered.filter(t => t.type === 'EXPENSE');
    }

    // Filtro por datas
    if (this.filters.startDate && this.filters.endDate) {
      const startDate = new Date(this.filters.startDate);
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Filtro por categoria
    if (this.filters.category) {
      filtered = filtered.filter(t =>
        t.category?.name === this.filters.category
      );
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
    console.log(`Filtros aplicados: ${filtered.length} de ${this.allTransactions.length} transações`);
  }

  // =================== MODAL DE TRANSAÇÃO ===================

  openTransactionModal(transaction: UnifiedTransaction) {
    this.selectedTransaction = transaction;
    this.showTransactionModal = true;
    console.log('Modal aberto para transação:', transaction);
  }

  closeTransactionModal() {
    this.showTransactionModal = false;
    this.selectedTransaction = null;
    console.log('Modal fechado');
  }

  editTransactionFromModal() {
    if (this.selectedTransaction) {
      this.editTransaction(this.selectedTransaction);
      this.closeTransactionModal();
    }
  }

  async deleteTransactionFromModal() {
    if (this.selectedTransaction && confirm(`Tem certeza que deseja excluir esta ${this.selectedTransaction.type === 'INCOME' ? 'receita' : 'despesa'}?`)) {
      try {
        console.log('Excluindo transação:', this.selectedTransaction);

        await this.transactionService.deleteTransaction(this.selectedTransaction.type, this.selectedTransaction.id);
        await this.loadAllTransactions();
        this.updateUniqueFilters();
        this.applyFilters();
        this.closeTransactionModal();

        console.log('Transação excluída com sucesso');
      } catch (error: any) {
        console.error('Erro ao deletar transação:', error);
        alert(error.message || 'Erro ao deletar transação');
      }
    }
  }

  // =================== EDIÇÃO ===================

  editTransaction(transaction: UnifiedTransaction) {
    // Configurar modo de edição
    this.isEditing = true;
    this.editingTransactionId = transaction.id;
    this.transactionType = transaction.type;

    // Mostrar formulário
    this.showForm = true;

    // Preencher formulário
    this.transactionForm.patchValue({
      date: transaction.date.split('T')[0],
      amount: transaction.amount,
      destination: transaction.destination,
      account: transaction.account,
      observation: transaction.observation || ''
    });

    // Setar categoria se existir
    if (transaction.category) {
      this.transactionForm.patchValue({
        categoryId: transaction.category.id
      });
      this.selectedCategoryName = transaction.category.name;
    }
    
    setTimeout(() => {
    this.scrollToForm();
  }, 100);

    console.log('Modo de edição ativado para:', transaction);
  }

  // =================== HELPERS ===================

  getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
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

private scrollToForm() {
 const formElement = document.querySelector('.form-container');
 if (formElement) {
   const elementPosition = formElement.getBoundingClientRect().top + window.pageYOffset;
   const offsetPosition = elementPosition - 80;
   
   window.scrollTo({
     top: offsetPosition,
     behavior: 'smooth'
   });
 }
}
}