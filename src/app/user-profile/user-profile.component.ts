import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserProfileService, UserProfileData, UserStats } from './user-profile.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  private userProfileService = inject(UserProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  profileData: UserProfileData | null = null;
  userStats: UserStats | null = null;
  loading = false;
  error = '';

  // Modal states
  showEditModal = false;
  showLogoutModal = false;

  // Form
  editProfileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserProfile();
    this.loadUserStats();
  }

  loadUserProfile() {
    this.loading = true;
    this.error = '';

    this.userProfileService.getUserProfileData().subscribe({
      next: (data: UserProfileData) => {
        this.profileData = data;
        this.loading = false;
        console.log('Dados do perfil carregados:', data);
      },
      error: (error: any) => {
        console.error('Erro ao carregar perfil:', error);
        this.error = 'Erro ao carregar dados do perfil';
        this.loading = false;
      }
    });
  }

  loadUserStats() {
    this.userProfileService.getUserStats().subscribe({
      next: (stats) => {
        this.userStats = stats;
        console.log('Estatísticas carregadas:', stats);
      },
      error: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
  }

  // =================== MODAL DE EDIÇÃO ===================

  openEditModal() {
    if (this.profileData) {
      this.editProfileForm.patchValue({
        name: this.profileData.personalInfo.name
      });
    }
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editProfileForm.reset();
  }

  saveProfile() {
    if (this.editProfileForm.valid) {
      const formData = this.editProfileForm.value;
      
      this.userProfileService.updateUserProfile(formData).subscribe({
        next: (response) => {
          // Atualizar dados locais
          if (this.profileData) {
            this.profileData.personalInfo.name = formData.name;
          }
          this.closeEditModal();
          console.log('Perfil atualizado com sucesso');
        },
        error: (error) => {
          console.error('Erro ao atualizar perfil:', error);
          this.error = 'Erro ao atualizar perfil';
        }
      });
    }
  }

  // =================== MODAL DE LOGOUT ===================

  openLogoutModal() {
    this.showLogoutModal = true;
  }

  closeLogoutModal() {
    this.showLogoutModal = false;
  }

  confirmLogout() {
    this.authService.logout();
    this.showLogoutModal = false;
  }

  // =================== NAVEGAÇÃO ===================

  goToInvestmentProfile() {
    this.router.navigate(['/app/perfil-investimento']);
  }

  goToRecommendations() {
    this.router.navigate(['/app/recomendacoes-investimento']);
  }

  goToCalculator() {
    this.router.navigate(['/app/calculadora']);
  }

  goToPiggyBanks() {
    this.router.navigate(['/app/cofrinhos']);
  }

  goToDashboard() {
    this.router.navigate(['/app/dashboard']);
  }

  goToEducationalContent() {
    this.router.navigate(['/app/conteudo-educacional']);
  }

  // =================== HELPERS ===================

  getUserInitials(): string {
    const name = this.profileData?.personalInfo.name || 'Usuario';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else {
      return names[0].substring(0, 2).toUpperCase();
    }
  }

  getRiskProfileText(): string {
    if (!this.profileData?.investorProfile) return '';
    return this.userProfileService.getRiskProfileText(this.profileData.investorProfile.riskProfile);
  }

  getRiskProfileColor(): string {
    if (!this.profileData?.investorProfile) return '#6c757d';
    return this.userProfileService.getRiskProfileColor(this.profileData.investorProfile.riskProfile);
  }

  getRiskProfileDescription(): string {
    if (!this.profileData?.investorProfile) return '';
    return this.userProfileService.getRiskProfileDescription(this.profileData.investorProfile.riskProfile);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  getRoleText(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'USER':
        return 'Usuário';
      default:
        return role;
    }
  }

  getCompletionPercentage(): number {
    if (!this.profileData) return 0;
    
    let completed = 0;
    const total = 4;
    
    if (this.profileData.personalInfo.name) completed++;
    if (this.profileData.personalInfo.email) completed++;
    if (this.profileData.investorProfile) completed++;
    if (this.profileData.recommendations) completed++;
    
    return Math.round((completed / total) * 100);
  }
}