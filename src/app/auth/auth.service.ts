import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { User } from '../entity/user';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface JwtPayload {
  sub: string; // subject (email)
  role: string;
  exp: number; // expiration
  iat: number; // issued at
  email?: string;
  name?: string;
  id?: string;
}

interface ApiError {
  error: string;
  description: string;
  detail?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/user';
  
  async register(newUser: User): Promise<User> {
    try {
      const response$ = this.http.post<User>(`${this.apiUrl}/create`, newUser);
      const result = await firstValueFrom(response$);
      
      console.log('Registro realizado com sucesso');
      return result;
      
    } catch (error) {
      console.error('Erro no registro:', error);
      
      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        
        if (apiError?.error === 'EMAIL_ALREADY_EXISTS') {
          throw new Error('Este email já está cadastrado');
        }
        
        const errorMessage = apiError?.description || 
                            apiError?.detail || 
                            apiError?.message || 
                            'Erro no cadastro';
        
        throw new Error(errorMessage);
      }
      
      throw new Error('Erro no cadastro');
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const loginData: LoginRequest = { email, password };
      const response$ = this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData);
      const result = await firstValueFrom(response$);
      
      localStorage.setItem('token', result.token);
      console.log('Login realizado com sucesso');
      return true;
      
    } catch (error) {
      console.error('Erro no login:', error);
      
      if (this.isHttpErrorResponse(error)) {
        if (error.status === 400 || error.status === 404) {
          throw new Error('Email ou senha incorretos');
        }
        
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro no login';
        
        throw new Error(errorMessage);
      }
      
      throw new Error('Erro no login');
    }
  }
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      if (decodedToken.exp <= currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      return false;
    }
  }

  hasRole(requiredRole: string): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.role === requiredRole;
    } catch (error) {
      console.error('Token error:', error);
      return false;
    }
  }
  
  logout(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getUserName(): string {
    const token = this.getToken();
    if (!token || !this.isTokenValid(token)) {
      return '';
    }
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.sub || decodedToken.name || '';
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  getUserEmail(): string {
    const token = this.getToken();
    if (!token || !this.isTokenValid(token)) {
      return '';
    }
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.email || '';
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  getUserId(): string {
    const token = this.getToken();
    if (!token || !this.isTokenValid(token)) {
      return '';
    }
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.id || '';
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      return decodedToken.exp > currentTime;
    } catch {
      return false;
    }
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}
