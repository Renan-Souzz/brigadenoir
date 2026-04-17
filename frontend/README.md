# Brigade Noir - Frontend

Este é o frontend da aplicação **Brigade Noir**, desenvolvido com **React**, **Vite**, **TypeScript** e **Tailwind CSS**. A aplicação utiliza o **Supabase** como backend para autenticação e banco de dados.

## 🚀 Como Executar Localmente

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Configure as variáveis de ambiente:**
    - Crie um arquivo `.env` na raiz da pasta `frontend`.
    - Copie o conteúdo de `.env.example` para `.env` e preencha os valores necessários.
    - Você precisará de:
        - `VITE_SUPABASE_URL`: A URL do seu projeto Supabase.
        - `VITE_SUPABASE_ANON_KEY`: A chave anônima (anon key) do seu projeto Supabase.

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

4.  **Acesse no navegador:** `http://localhost:3000`

## 📦 Deploy na Vercel

Este projeto está configurado para ser implantado na [Vercel](https://vercel.com/).

### Passos para o Deploy:

1.  **Conecte seu repositório GitHub à Vercel.**
2.  **Configurações do Projeto:**
    - **Framework Preset:** Vite
    - **Root Directory:** `frontend`
    - **Build Command:** `npm run build`
    - **Output Directory:** `dist`
3.  **Variáveis de Ambiente:**
    - No painel da Vercel, adicione as seguintes variáveis:
        - `VITE_SUPABASE_URL`
        - `VITE_SUPABASE_ANON_KEY`
4.  **Clique em Deploy.**

## 🛠️ Tecnologias Utilizadas

- **React 19**
- **Vite 6**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (Ícones)
- **Framer Motion** (Animações)
- **Supabase** (Autenticação e Banco de Dados)
- **TanStack Query** (Gerenciamento de Estado de API)

## 📁 Estrutura do Projeto

- `src/components`: Componentes reutilizáveis da interface.
- `src/contexts`: Contextos do React para estado global.
- `src/hooks`: Custom hooks.
- `src/lib`: Configurações de bibliotecas externas (ex: Supabase).
- `src/services`: Serviços para chamadas de API e lógica de negócio.
- `src/utils`: Funções utilitárias e constantes.
- `supabase`: Scripts SQL para configuração do banco de dados.

## 🗄️ Configuração do Banco de Dados

Os arquivos SQL necessários para configurar o banco de dados estão localizados na pasta `frontend/supabase/`. Você pode executá-los no Editor SQL do console do Supabase.

1. Execute `schema.sql` para criar as tabelas básicas.
2. Execute `ft_module.sql` para adicionar funcionalidades específicas do módulo de Ficha Técnica.
