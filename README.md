# HealthTrack

Web app para registrar hábitos de saúde (academia e alimentação), ver indicadores e gráficos e compartilhar relatórios em PDF com profissionais autorizados. Projeto de Extensão III - Análise e Desenvolvimento de Sistemas.

**Tecnologias:** Node.js + Express, PostgreSQL, HTML/CSS/JavaScript, PDFKit, JWT + bcrypt.

## O que já está pronto (MVP)

| Requisito | Onde |
|---|---|
| RF01 e RF02 - cadastro e login | `src/routes/auth.js` |
| RF03 e RF04 - registro diário (criar, editar, consultar) | `src/routes/registros.js` |
| RF05 e RF06 - dashboard e gráficos semanais | `src/routes/dashboard.js`, `src/stats.js` |
| RF07 - relatório em PDF | `src/routes/relatorios.js`, `src/pdf.js` |
| RF08 - convidar, autorizar e revogar profissional | `src/routes/vinculos.js` |
| RF09 - compartilhar relatório | `src/routes/relatorios.js` |
| RF10 - área do profissional (somente leitura) | `src/routes/profissional.js` |

Metas e notificações ficam para a versão 2 (a tabela `meta` já existe no banco).

## 1. Rodar no seu computador

Você precisa do **Node.js 18 ou superior** (https://nodejs.org) e de um banco **PostgreSQL**. Para o banco, escolha um:

- **Mais fácil:** criar um banco gratuito no Neon (passo 2.1) e usar a mesma conexão no seu computador.
- **Local:** instalar o PostgreSQL e criar um banco chamado `healthtrack`.

Depois, na pasta do projeto:

```bash
npm install
cp .env.example .env        # no Windows: copy .env.example .env
```

Abra o arquivo `.env` e preencha:

- `DATABASE_URL`: a conexão com o banco.
- `JWT_SECRET`: um texto longo e aleatório. Para gerar um:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Inicie:

```bash
npm start
```

Abra http://localhost:3000. As tabelas são criadas sozinhas na primeira execução.

## 2. Colocar online (gratuito)

Combinação sugerida: **Neon** (banco) + **Render** (aplicação) + **GitHub** (código). Os limites dos planos gratuitos mudam, então confira nos sites.

### 2.1 Banco no Neon
1. Crie uma conta em https://neon.tech e um projeto novo.
2. No painel, copie a **connection string** (começa com `postgresql://`).
3. Guarde-a: ela será o `DATABASE_URL`.

### 2.2 Código no GitHub
1. Crie um repositório no GitHub (pode ser privado).
2. Na pasta do projeto: `git init`, `git add .`, `git commit -m "HealthTrack"`, e envie com os comandos que o GitHub mostra.
3. O arquivo `.env` **não** vai para o GitHub (já está no `.gitignore`). Nunca publique senhas.

### 2.3 Aplicação no Render
1. Crie uma conta em https://render.com e clique em **New > Web Service**.
2. Conecte o repositório do GitHub.
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Em **Environment**, adicione:
   - `DATABASE_URL` = a connection string do Neon
   - `JWT_SECRET` = o texto aleatório
5. Clique em **Create Web Service**. Ao terminar, o Render mostra o endereço público do app (`https://seu-app.onrender.com`).

No plano gratuito o serviço "dorme" quando fica parado, e o primeiro acesso demora alguns segundos. Abra o app antes de apresentar.

## 3. Roteiro de teste e apresentação

1. Crie uma conta de **Profissional** (ex.: nutricionista).
2. Saia e crie uma conta de **Aluno**.
3. Aluno: aba **Registro** - registre alguns dias (use datas diferentes).
4. Aluno: aba **Painel** - veja treinos, dias registrados e o gráfico por semana.
5. Aluno: aba **Profissionais** - convide o e-mail do profissional e clique em **Autorizar acesso**.
6. Aluno: aba **Relatórios** - gere um relatório, abra o PDF e compartilhe com o profissional.
7. Saia e entre como Profissional: veja o aluno, o painel dele e o relatório recebido.
8. Volte como Aluno, clique em **Revogar acesso** e confirme que o profissional perde o acesso.

Use **dados fictícios** na demonstração.

## 4. Segurança e LGPD (para citar na documentação)

- Senhas guardadas com hash (bcrypt), nunca em texto puro.
- Login por token JWT com validade de 7 dias.
- Autorização no servidor: o profissional só acessa aluno com vínculo "autorizado" (RN05) e perde o acesso ao revogar (RN06).
- Consultas SQL parametrizadas (protege contra SQL injection).
- HTTPS fornecido pela hospedagem.
- Dados de saúde são dados pessoais sensíveis: coletar só o necessário e manter o consentimento do aluno.

## 5. Melhorias possíveis

- Metas (RF11) e lembretes (RF12).
- Limitar tentativas de login (pacote `express-rate-limit`).
- Exportar e excluir todos os dados do usuário (direitos do titular na LGPD).
- Testes automatizados da API.

## Estrutura

```
server.js            inicia o servidor e cria as tabelas
db/schema.sql        modelo de dados
src/                 banco, autenticação, indicadores, PDF
src/routes/          rotas da API
public/              telas (HTML, CSS, JavaScript)
```
