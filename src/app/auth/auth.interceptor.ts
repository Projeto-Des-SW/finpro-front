import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');
  
  console.log('Interceptor executando para:', req.url);
  
  // Adicionar token se existir
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}` 
      }
    });
    console.log('Token adicionado na requisição');
  } else {
    console.log('Requisição sem token');
  }
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('Interceptor capturou erro:', error.status);
      
      if (error.status === 401) {
        console.log('Token inválido ou expirado - fazendo logout');
        authService.forceLogout('Sua sessão expirou. Faça login novamente.');
        return throwError(() => new Error('Sessão expirada'));
      }
      
      if (error.status === 403) {
        console.log('Acesso negado');
        authService.forceLogout('Acesso negado. Faça login novamente.');
        return throwError(() => new Error('Acesso negado'));
      }
      
      return throwError(() => error);
    })
  );
};