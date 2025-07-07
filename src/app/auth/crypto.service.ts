import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  
  private readonly SECRET_KEY = 'minha-chave-secreta-2024';
  

  obfuscatePassword(password: string): string {
    return btoa(password + '::' + this.SECRET_KEY); 
  }
  
  deobfuscatePassword(obfuscated: string): string {
    try {
      const decoded = atob(obfuscated);
      const [password] = decoded.split('::');
      return password;
    } catch {
      return obfuscated; 
    }
  }
  
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
