import { Injectable } from '@angular/core';
import { User } from '../entity/user';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl + '/user';
  
  constructor(private cryptoService: CryptoService) {}
  
  async register(newUser: User): Promise<User> {
    const obfuscatedPassword = this.cryptoService.obfuscatePassword(newUser.password);
    
    const userWithObfuscatedPassword = {
      ...newUser,
      password: obfuscatedPassword
    };
    
    console.log('Registering user:', { 
      name: userWithObfuscatedPassword.name, 
      email: userWithObfuscatedPassword.email, 
      role: userWithObfuscatedPassword.role,
      password: '[OBFUSCATED]'
    });
    
    const response = await fetch(`${this.apiUrl}/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password-Encoding': 'base64-obfuscated' 
      },
      body: JSON.stringify(userWithObfuscatedPassword)
    });
  
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail); 
    }
  
    return data;
  }

  async login(email: string, password: string): Promise<boolean> {
    const obfuscatedPassword = this.cryptoService.obfuscatePassword(password);
    
    console.log('Login attempt for:', email);
    
    const response = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password-Encoding': 'base64-obfuscated' 
      },
      body: JSON.stringify({ 
        email, 
        password: obfuscatedPassword 
      }),
    });

    if (response.status === 400) {
      throw new Error('Credenciais inválidas. Verifique seu email e senha.');
    }

    if (!response.ok) {
      throw new Error('Login falhou');
    }
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    return true;
  }
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const decodedToken: any = jwtDecode(token);
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
      const decodedToken: any = jwtDecode(token);
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
      const decodedToken: any = jwtDecode(token);
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
      const decodedToken: any = jwtDecode(token);
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
      const decodedToken: any = jwtDecode(token);
      return decodedToken.id || '';
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decodedToken.exp > currentTime;
    } catch {
      return false;
    }
  }
}