import { Injectable } from '@angular/core';
import { User } from '../entity/user';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl + '/user'; 
  
  async register(newUser: User): Promise<User> {
    const response = await fetch(`${this.apiUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
  
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail); 
    }
  
    return data;
  }


  async login(email: string, password: string): Promise<boolean> {

    const response = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
  
  hasRole(requiredRole: string): boolean {
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
    return !!this.getToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUserName(): string {
    const token = this.getToken();
    if (!token) {
      return '';
    }
    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.sub;
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  getUserEmail(): string {
    const token = this.getToken();
    if (!token) {
      return '';
    }
    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.email;
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }

  getUserId(): string {
    const token = this.getToken();
    if (!token) {
      return '';
    }
    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.id;
    } catch (error) {
      console.error('Token error:', error);
      return '';
    }
  }
  
   
}