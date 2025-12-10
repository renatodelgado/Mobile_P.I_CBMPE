# Chama --- Sistema de Registro de Ocorrências (CBMPE)

Aplicativo móvel desenvolvido em **React Native + Expo + TypeScript**
para o **Sistema de Registro, Gestão e Acompanhamento de Ocorrências**
do\
**Corpo de Bombeiros Militar de Pernambuco (CBMPE)**.

> Projeto voltado para **operadores em campo**, com suporte a
> **funcionamento offline** e **sincronização automática** com o
> backend.

------------------------------------------------------------------------

## Sobre o Sistema

Conheça o propósito, a arquitetura e o time responsável pelo
desenvolvimento da plataforma.

### Visão Geral

O sistema foi desenvolvido para o **Corpo de Bombeiros Militar de
Pernambuco (CBMPE)** com o objetivo de **modernizar o fluxo de registro,
gestão e acompanhamento de ocorrências**.

A plataforma é composta por dois módulos que operam de forma integrada:

-   🖥 **Painel Web Administrativo**
-   📱 **Aplicativo Mobile para Operadores em Campo**

Ambos compartilham o **mesmo backend**, garantindo integração em tempo
real entre gestão e operação.

------------------------------------------------------------------------

## Estrutura da Plataforma

### 🖥 Painel Web --- Administrativo

Utilizado por equipes administrativas do CBMPE. Permite:

-   ✅ Cadastro de novas ocorrências
-   ✅ Gestão e edição de registros
-   ✅ Dashboard com mapas e heatmaps
-   ✅ Gestão de usuários e permissões

------------------------------------------------------------------------

### 📱 Aplicativo Mobile --- Operadores em Campo

Desenvolvido para equipes que atuam diretamente nas ocorrências:

-   ✅ Cadastro e edição de ocorrências
-   ✅ Funcionamento **offline**
-   ✅ Sincronização automática ao voltar a ficar online

------------------------------------------------------------------------

## Funcionalidades

-   Cadastro e edição de ocorrências
-   Operação offline
-   Sincronização automática
-   Autenticação de usuários
-   Gestão de permissões (via painel web)
-   Visualização de mapas e dashboard

------------------------------------------------------------------------

## Tecnologias Utilizadas

-   React + TypeScript (Web)
-   React Native + Expo (Mobile)
-   Node.js + Express (Backend)
-   MySQL + TypeORM (Banco de Dados)
-   Vercel / Netlify (Deploy Web)
-   Railway (API + Banco)
-   Cloudinary (Uploads)

------------------------------------------------------------------------

## Pré-requisitos

-   Node.js (versão LTS recomendada)
-   Yarn
-   Expo Go instalado no celular
-   Emulador Android (opcional)

------------------------------------------------------------------------

## Instalação e Execução

### 1️⃣ Instalar dependências

``` bash
yarn install
```

### 2️⃣ Iniciar o servidor Expo

``` bash
yarn expo start --clear
```

### 3️⃣ Executar no celular

-   Abra o **Expo Go**
-   Escaneie o **QR Code** exibido

✅ O celular e o computador devem estar na **mesma rede Wi-Fi**.

------------------------------------------------------------------------

## Configuração da API

Edite o arquivo:

    services/api.ts

Exemplo:

``` ts
baseURL: "http://192.168.0.10:3000"
```

------------------------------------------------------------------------

## Equipe Desenvolvedora

Projeto desenvolvido pelos estudantes do **Grupo 1 --- Turma 43** da
**Faculdade Senac Pernambuco**, como **Projeto Integrador do 3º
período**:

-   João Victor Rodrigues Basante
-   João Vitor Malveira da Silva
-   Maria Clara de Melo
-   Renato Trancoso Branco Delgado
-   Thayana Anália dos Santos Lira
-   Vinicius Henrique Silva Nascimento

------------------------------------------------------------------------

## Professores e Disciplinas

-   Coding Mobile --- Prof. Geraldo Júnior (Orientador)
-   User Experience --- Prof. Marcos Tenório
-   Backend e Arquitetura --- Prof. Danilo Farias
-   Comunicação Empresarial --- Prof. Carol Luz
-   Engenharia de Software --- Prof. Sonia Gomes
-   Data Science --- Prof. Welton Dionísio

------------------------------------------------------------------------

## Suporte

Em caso de dúvidas ou sugestões de melhoria, consulte a documentação
interna do projeto ou entre em contato com o time desenvolvedor.

------------------------------------------------------------------------

🔥 **Chama --- Tecnologia a serviço de quem salva vidas.**
