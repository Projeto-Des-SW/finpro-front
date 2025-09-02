import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../auth/auth.service';
import { EducationalContentService } from './educational-content.service';
import { EducationalContent, EducationalContentResponse } from '../entity/educational-content';

@Component({
  selector: 'app-educational-content',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './educational-content.component.html',
  styleUrls: ['./educational-content.component.css']
})
export class EducationalContentComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private contentService = inject(EducationalContentService);
  private sanitizer = inject(DomSanitizer);

  contents: EducationalContentResponse[] = [];
  filteredContents: EducationalContentResponse[] = [];
  uniqueCategories: string[] = [];

  showForm = false;
  loading = false;
  errorMessage = '';
  isAdmin = false;

  // Estado de edição
  isEditing = false;
  editingContentId: number | null = null;

  // Modal de visualização
  showContentModal = false;
  selectedContent: EducationalContentResponse | null = null;

  // Filtros
  selectedCategory = '';
  searchTerm = '';

  // Formulário
  contentForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    category: ['', [Validators.required]],
    videoUrl: [''],
    fileUrl: ['']
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.checkAdminRole();
    this.loadContent();
  }

  private checkAdminRole() {
    // Verificar se o usuário é admin (baseado no token JWT)
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.isAdmin = payload.role === 'ADMIN';
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error);
        this.isAdmin = false;
      }
    }
  }

  async loadContent() {
    this.loading = true;
    try {
      this.contents = await this.contentService.getAllContent();
      this.uniqueCategories = this.contentService.getUniqueCategories(this.contents);
      this.applyFilters();
      console.log('Conteúdos carregados:', this.contents);
    } catch (error: any) {
      console.error('Erro ao carregar conteúdos:', error);
      this.errorMessage = error.message || 'Erro ao carregar conteúdos';
    } finally {
      this.loading = false;
    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  async onSubmit() {
    if (this.contentForm.valid && this.isAdmin) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const contentData: EducationalContent = {
          title: this.contentForm.get('title')?.value,
          description: this.contentForm.get('description')?.value,
          category: this.contentForm.get('category')?.value,
          videoUrl: this.contentForm.get('videoUrl')?.value || undefined,
          fileUrl: this.contentForm.get('fileUrl')?.value || undefined
        };

        if (this.isEditing && this.editingContentId) {
          // Atualizar conteúdo existente
          await this.contentService.updateContent(this.editingContentId, contentData);
          console.log('Conteúdo atualizado com sucesso');
        } else {
          // Criar novo conteúdo
          await this.contentService.createContent(contentData);
          console.log('Conteúdo criado com sucesso');
        }

        // Recarregar dados
        await this.loadContent();

        // Reset do formulário
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao salvar conteúdo:', error);
        this.errorMessage = error.message || 'Erro ao salvar conteúdo';
      } finally {
        this.loading = false;
      }
    } else {
      this.contentForm.markAllAsTouched();
      if (!this.isAdmin) {
        this.errorMessage = 'Você não tem permissão para criar conteúdo';
      }
    }
  }

  resetForm() {
    this.contentForm.reset();
    this.errorMessage = '';
    
    // Reset do estado de edição
    this.isEditing = false;
    this.editingContentId = null;
  }

  editContent(content: EducationalContentResponse) {
    if (!this.isAdmin) {
      this.errorMessage = 'Você não tem permissão para editar conteúdo';
      return;
    }

    // Configurar modo de edição
    this.isEditing = true;
    this.editingContentId = content.id;

    // Preencher formulário
    this.contentForm.patchValue({
      title: content.title,
      description: content.description,
      category: content.category,
      videoUrl: content.videoUrl || '',
      fileUrl: content.fileUrl || ''
    });

    // Mostrar formulário
    this.showForm = true;
    this.errorMessage = '';

    setTimeout(() => {
      this.scrollToForm();
    }, 100);

    console.log('Editando conteúdo:', content);
  }

  async deleteContent(contentId: number) {
    if (!this.isAdmin) {
      this.errorMessage = 'Você não tem permissão para deletar conteúdo';
      return;
    }

    if (confirm('Tem certeza que deseja excluir este conteúdo?')) {
      try {
        await this.contentService.deleteContent(contentId);
        await this.loadContent();
        console.log('Conteúdo excluído com sucesso');
      } catch (error: any) {
        console.error('Erro ao deletar conteúdo:', error);
        alert(error.message || 'Erro ao deletar conteúdo');
      }
    }
  }

  // =================== FILTROS ===================

  applyFilters() {
    let filtered = [...this.contents];

    // Filtro por categoria
    if (this.selectedCategory) {
      filtered = filtered.filter(content => 
        content.category === this.selectedCategory
      );
    }

    // Filtro por busca
    if (this.searchTerm) {
      const searchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(searchTerm) ||
        content.description.toLowerCase().includes(searchTerm) ||
        content.category.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredContents = filtered;
    console.log(`Filtros aplicados: ${filtered.length} de ${this.contents.length} conteúdos`);
  }

  // =================== MODAL DE VISUALIZAÇÃO ===================

  openContentModal(content: EducationalContentResponse) {
    this.selectedContent = content;
    this.showContentModal = true;
    console.log('Modal aberto para conteúdo:', content);
  }

  closeContentModal() {
    this.showContentModal = false;
    this.selectedContent = null;
  }

  // =================== HELPERS ===================

  getYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;

    // Extrair ID do vídeo do YouTube
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }

    return null;
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