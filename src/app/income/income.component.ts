import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { IncomeService } from './income.service';
import { IncomeCategoryService, IncomeCategory } from './income-category.service';
import { Income } from '../entity/income';


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

interface FilterOptions {
  startDate: string;
  endDate: string;
  category: string;
  account: string;
  searchTerm: string;
}

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.css']
})
export class IncomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private incomeService = inject(IncomeService);
  private incomeCategoryService = inject(IncomeCategoryService);

  incomes: IncomeResponse[] = [];
  filteredIncomes: IncomeResponse[] = [];
  categories: IncomeCategory[] = [];
  uniqueAccounts: string[] = [];
  
  showForm = false;
  loading = false;
  errorMessage = '';
  showCustomDateRange = false;
  selectedPeriod = ''; // Default: Todas as receitas

  // Propriedades para o dropdown de categorias
  showCategoryDropdown = false;
  selectedCategoryName = '';
  newCategoryName = '';
  creatingCategory = false;
  categoryError = '';

  // Propriedades para o modal de receita
  showTransactionModal = false;
  selectedTransaction: IncomeResponse | null = null;

  // Propriedades para edição
  isEditing = false;
  editingIncomeId: number | null = null;

  filters: FilterOptions = {
    startDate: '',
    endDate: '',
    category: '',
    account: '',
    searchTerm: ''
  };

  incomeForm: FormGroup = this.fb.group({
    date: [this.getCurrentDate(), [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    incomeCategoryId: ['', [Validators.required]],
    paymentOrigin: ['', [Validators.required]],
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
    this.filters.startDate = '';
    this.filters.endDate = '';
    this.selectedPeriod = '';
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadIncomes(),
        this.loadCategories()
      ]);
      this.updateUniqueAccounts();
      this.applyFilters();
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      this.errorMessage = error.message || 'Erro ao carregar dados';
    }
  }

  async loadIncomes() {
    this.incomes = await this.incomeService.getAllIncomes() as IncomeResponse[];
  }

  async loadCategories() {
    this.categories = await this.incomeCategoryService.getAllCategories();
  }

  updateUniqueAccounts() {
    const accounts = this.incomes.map(income => income.balanceSource);
    this.uniqueAccounts = [...new Set(accounts)].filter(Boolean);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  // =================== CATEGORIAS DROPDOWN ===================
  
  toggleCategoryDropdown() {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.categoryError = '';
  }

  selectCategory(category: IncomeCategory) {
    this.incomeForm.get('incomeCategoryId')?.setValue(category.incomeCategoryId);
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
      const newCategory = await this.incomeCategoryService.findOrCreateCategory(
        this.newCategoryName.trim()
      );
      
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
    if (this.incomeForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const categoryId = this.incomeForm.get('incomeCategoryId')?.value;

        if (!categoryId) {
          this.errorMessage = 'Selecione uma categoria';
          this.loading = false;
          return;
        }

        const incomeData: Income = {
          date: this.incomeForm.get('date')?.value,
          amount: this.incomeForm.get('amount')?.value,
          incomeCategoryId: categoryId,
          paymentOrigin: this.incomeForm.get('paymentOrigin')?.value,
          balanceSource: this.incomeForm.get('balanceSource')?.value,
          observation: this.incomeForm.get('observation')?.value || undefined
        };

        if (this.isEditing && this.editingIncomeId) {
          // Atualizar receita existente
          await this.incomeService.updateIncome(this.editingIncomeId, incomeData);
          console.log('Receita atualizada com sucesso');
        } else {
          // Criar nova receita
          await this.incomeService.createIncome(incomeData);
          console.log('Receita criada com sucesso');
        }
        
        // Recarrega os dados
        await this.loadIncomes();
        this.updateUniqueAccounts();
        this.applyFilters();
        
        // Reset do formulário
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao salvar receita:', error);
        this.errorMessage = error.message || 'Erro ao salvar receita';
      } finally {
        this.loading = false;
      }
    } else {
      this.incomeForm.markAllAsTouched();
    }
  }

  resetForm() {
    this.incomeForm.reset({
      date: this.getCurrentDate()
    });
    this.errorMessage = '';
    this.selectedCategoryName = '';
    this.newCategoryName = '';
    this.categoryError = '';
    this.showCategoryDropdown = false;
    
    // Reset edição
    this.isEditing = false;
    this.editingIncomeId = null;
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
    let filtered = [...this.incomes];

    // Filtro por datas
    if (this.filters.startDate && this.filters.endDate) {
      const startDate = new Date(this.filters.startDate);
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= startDate && incomeDate <= endDate;
      });
    }

    // Filtro por categoria
    if (this.filters.category) {
      filtered = filtered.filter(income => 
        income.category?.name === this.filters.category
      );
    }

    // Filtro por conta
    if (this.filters.account) {
      filtered = filtered.filter(income => 
        income.balanceSource === this.filters.account
      );
    }

    // Filtro por busca
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(income =>
        income.paymentOrigin.toLowerCase().includes(searchTerm) ||
        income.balanceSource.toLowerCase().includes(searchTerm) ||
        (income.observation && income.observation.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredIncomes = filtered;
  }

  // =================== MODAL DE RECEITA ===================

  openTransactionModal(income: IncomeResponse) {
    this.selectedTransaction = income;
    this.showTransactionModal = true;
  }

  closeTransactionModal() {
    this.showTransactionModal = false;
    this.selectedTransaction = null;
  }

  editIncomeFromModal() {
    if (this.selectedTransaction) {
      this.editIncome(this.selectedTransaction);
      this.closeTransactionModal();
    }
  }

  async deleteIncomeFromModal() {
    if (this.selectedTransaction && confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        await this.incomeService.deleteIncome(this.selectedTransaction.incomeId);
        await this.loadIncomes();
        this.updateUniqueAccounts();
        this.applyFilters();
        this.closeTransactionModal();
      } catch (error: any) {
        console.error('Erro ao deletar receita:', error);
        alert(error.message || 'Erro ao deletar receita');
      }
    }
  }

  async deleteIncome(incomeId: number) {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        await this.incomeService.deleteIncome(incomeId);
        await this.loadIncomes();
        this.updateUniqueAccounts();
        this.applyFilters();
      } catch (error: any) {
        console.error('Erro ao deletar receita:', error);
        alert(error.message || 'Erro ao deletar receita');
      }
    }
  }

  editIncome(income: IncomeResponse) {
    // Preencher o formulário com os dados da receita
    this.incomeForm.patchValue({
      date: income.date,
      amount: income.amount,
      incomeCategoryId: income.category?.incomeCategoryId || '',
      paymentOrigin: income.paymentOrigin,
      balanceSource: income.balanceSource,
      observation: income.observation || ''
    });

    // Definir categoria selecionada no dropdown
    if (income.category) {
      this.selectedCategoryName = income.category.name;
    }

    // Configurar modo de edição
    this.isEditing = true;
    this.editingIncomeId = income.incomeId;
    
    // Mostrar formulário
    this.showForm = true;
    
    // Limpar erros
    this.errorMessage = '';
    
    console.log('Editando receita:', income);
  }

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