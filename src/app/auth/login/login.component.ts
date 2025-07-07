import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',    
  styleUrls: ['./login.component.css']     
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = false;
  errorMessage = '';
  passwordVisible = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const { email, password } = this.loginForm.value;
      console.log('Tentativa de login para:', email);

      try {
        const success = await this.authService.login(email, password);
        
        if (success) {
          console.log('Login realizado com sucesso');
          this.router.navigate(['/dashboard']);
        }
        
      } catch (error: any) {
        console.error('Erro no login:', error);
        this.errorMessage = error.message || 'Erro ao fazer login';
        
      } finally {
        this.loading = false;
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}