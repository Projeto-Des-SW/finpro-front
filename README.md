# 💰 FinPro – Frontend

**Integrantes**
[Isabel Tenório](https://github.com/isabe1ltenorio) | [Iasmin Raquel](https://github.com/iasmin-raquel) | [Tayane Cibely](https://github.com/TayaneCibely) | [Leonardo Nunes](https://github.com/leonardonb) | [Izabel Nascimento](https://github.com/izabelnascimento) | [Letícia Lívia](https://github.com/mymph)

## 📃 Sobre o Projeto

Este repositório contém a interface frontend do sistema **FinPro**, uma aplicação web para gestão financeira pessoal, desenvolvida com **Angular 19** e **TypeScript**. O projeto está sendo realizado para a disciplina de **Projeto de Desenvolvimento** do curso de **Bacharelado em Ciência da Computação** da **UFAPE**, sob orientação do professor Rodrigo Gusmão de Carvalho Rocha, como parte do **Período 2025.1**.

O FinPro é um sistema que oferece uma plataforma completa para controle de finanças pessoais.

O frontend se comunica com um backend em Spring Boot, disponível [neste repositório](https://github.com/Projeto-Des-SW/finpro-service).

## 📍 Objetivos do Sistema

* Permitir que usuários controlem suas finanças pessoais de forma digital e organizada
* Oferecer uma interface intuitiva para cadastro e visualização de despesas
* Implementar sistema de autenticação seguro com diferentes níveis de acesso
* Proporcionar um dashboard centralizado com informações financeiras relevantes
* Facilitar o acompanhamento de gastos através de categorização

## 🛠️ Tecnologias Usadas

* **Angular 19** - Framework principal
* **TypeScript** - Linguagem de programação

## 🚧 Status do Projeto

🔨 Em desenvolvimento - Entrega parcial referente ao Período 2025.1

## 📂 Organização

Este repositório está organizado com:

* `src/app/auth/` – Módulo de autenticação (login, registro, guards)
* `src/app/dashboard/` – Dashboard principal do sistema
* `src/app/home/` – Página inicial
* `src/app/entity/` – Interfaces e modelos de dados
* `src/environments/` – Configurações de ambiente
* `public/assets/` – Arquivos estáticos (imagens, ícones)
* `src/styles.css` – Estilos globais

## 🚀 Instruções para rodar localmente

### Pré-requisitos

1. **Backend (API) rodando** - Certifique-se de que o [backend Spring Boot](https://github.com/Projeto-Des-SW/finpro-service) esteja executando em `https://finpro-service-191642919864.southamerica-east1.run.app/register`
2. **Node.js** na versão mais atual
3. **Angular CLI** instalado globalmente

### Instalação e Execução

1. **Clonar o repositório:**
```bash
git clone https://github.com/Projeto-Des-SW/finpro-front.git
cd finpro-front
```

2. **Instalar as dependências:**
```bash
npm i
```

3. **Instalar Angular CLI globalmente (se não tiver):**
```bash
npm install -g @angular/cli
```

4. **Executar em ambiente de desenvolvimento:**
```bash
ng serve
```

O sistema estará disponível em: **[FINPRO](https://finpro-frontend-191642919864.southamerica-east1.run.app/register)**

## 📡 Configuração

### Ambiente de Desenvolvimento

O arquivo `src/environments/environment.prod.ts` está configurado para:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://finpro-frontend-191642919864.southamerica-east1.run.app'
};
```

Certifique-se de que o backend esteja rodando na porta 8080 antes de iniciar o frontend.

## 🎨 Interface


🔙 [Protótipos Figma](https://www.figma.com/design/4blULCjgSOj3r65yfiCmb7/Projet%C3%A3o?node-id=7-865&t=uHt14WtNrZOlpRbP-1)

## 🌐 Hospedagem

O sistema também está disponível online em:  
**[FinPro](https://finpro-frontend-191642919864.southamerica-east1.run.app/register)**

## 📎 Links Relacionados

🔙 [Backend do FinPro (Spring Boot)](https://github.com/Projeto-Des-SW/finpro-service)  
🎥 [Pitch](https://www.youtube.com/watch?v=b6vzSrNGmP)

## 👨‍🏫 Professor Responsável

**Rodrigo Gusmão de Carvalho Rocha**  
Disciplina: Projeto de Desenvolvimento – UFAPE  
Período: 2025.1

## 📄 Licença

Este projeto está sendo desenvolvido para fins acadêmicos como parte da disciplina de Projeto de Desenvolvimento da UFAPE.
