# HealthTrack

**Aplicação web para acompanhamento de hábitos de saúde**

Projeto de Extensão III · Análise e Desenvolvimento de Sistemas

| | |
|---|---|
| Autor(a) | [Leonardo Santos] |
| Instituição | [Faculdade Descomplica] |
| Curso | Análise e Desenvolvimento de Sistemas |
| Ano | 2026 |

---

## Resumo

O HealthTrack é uma aplicação web que permite ao usuário registrar diariamente sua prática de atividade física e a aderência ao planejamento alimentar, acompanhar a evolução por meio de indicadores e gráficos e gerar relatórios periódicos em PDF. Esses relatórios podem ser compartilhados com profissionais que acompanham o usuário, como instrutores e nutricionistas, mediante autorização explícita e revogável. O sistema organiza informações e não substitui avaliação, diagnóstico ou orientação de profissionais de saúde.

**Palavras-chave:** hábitos de saúde, aplicação web, registro diário, relatório, privacidade de dados.

## 1. Introdução

### 1.1 Situação-problema

Informações sobre a frequência de treinos, a alimentação e as observações da rotina costumam ficar dispersas em mensagens, anotações ou na memória do usuário. Essa dispersão dificulta a construção de um histórico confiável e o compartilhamento dessas informações com os profissionais responsáveis pelo acompanhamento.

### 1.2 Objetivo geral

Desenvolver uma aplicação web que centralize o registro da rotina de atividade física e alimentação e facilite o compartilhamento controlado desse histórico com profissionais.

### 1.3 Objetivos específicos

- Permitir o registro diário de treino, aderência alimentar e observações.
- Apresentar indicadores e gráficos do período escolhido pelo usuário.
- Gerar relatórios periódicos em PDF.
- Garantir que o profissional acesse apenas dados de usuários que autorizaram o vínculo.
- Aplicar boas práticas de segurança no tratamento de dados de saúde.

### 1.4 Público-alvo

- **Aluno (usuário):** pessoa que registra a própria rotina, acompanha a evolução e decide o que compartilha.
- **Profissional:** instrutor de academia ou nutricionista que consulta, somente para leitura, os dados de alunos que o autorizaram.

## 2. Escopo

### 2.1 Versão atual (MVP)

| Código | Funcionalidade |
|---|---|
| RF01 | Cadastro de conta (aluno ou profissional) |
| RF02 | Autenticação por e-mail e senha |
| RF03 | Registro diário de academia, duração, alimentação e observação |
| RF04 | Consulta e edição de registros anteriores |
| RF05 | Painel com indicadores do período |
| RF06 | Gráfico semanal de treinos e dias registrados |
| RF07 | Geração de relatório em PDF |
| RF08 | Convite, autorização e revogação de vínculo com profissional |
| RF09 | Compartilhamento de relatório com profissional autorizado |
| RF10 | Área do profissional para consulta de alunos e relatórios recebidos |

### 2.2 Fora do escopo desta versão

Metas de registro e frequência, notificações e lembretes, e comparativos avançados entre períodos. A tabela de metas já consta no modelo de dados para a versão seguinte.

## 3. Regras de negócio

| Código | Regra |
|---|---|
| RN01 | Cada aluno possui no máximo um registro por data. |
| RN02 | A duração do treino só é informada quando houve ida à academia e deve ser maior que zero. |
| RN03 | A alimentação é classificada em: seguiu o planejamento, seguiu parcialmente ou não seguiu. |
| RN04 | O indicador "dias seguindo o planejamento" considera apenas registros classificados como "seguiu". |
| RN05 | O profissional só acessa dados de alunos com vínculo no estado "autorizado". |
| RN06 | Ao revogar o vínculo, o profissional perde imediatamente o acesso aos registros e relatórios do aluno. |
| RN07 | Apenas o próprio aluno cria e edita seus registros; o profissional tem acesso somente de leitura. |
| RN08 | O relatório só é gerado para períodos com pelo menos um registro. |

## 4. Arquitetura

A aplicação segue uma arquitetura cliente-servidor em três camadas.

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Apresentação | HTML, CSS e JavaScript | Interface em página única, gráficos em SVG |
| Aplicação | Node.js e Express | API REST, regras de negócio, autenticação e geração de PDF |
| Dados | PostgreSQL | Persistência e restrições de integridade |

Bibliotecas principais: `pg` (acesso ao banco), `bcryptjs` (hash de senhas), `jsonwebtoken` (autenticação por token) e `pdfkit` (geração de relatórios).

A configuração sensível (conexão com o banco e segredo de assinatura dos tokens) é fornecida por variáveis de ambiente e não faz parte do código-fonte. Na implantação de demonstração, a aplicação foi hospedada no Render e o banco de dados no Neon, ambos em planos gratuitos.

### 4.1 Estrutura do projeto

```
server.js            inicialização do servidor e criação das tabelas
db/schema.sql        modelo de dados
src/                 conexão, autenticação, indicadores e geração de PDF
src/routes/          rotas da API, uma por módulo
public/              interface (HTML, CSS e JavaScript)
```

### 4.2 Principais rotas da API

| Método | Rota | Perfil | Função |
|---|---|---|---|
| POST | /api/auth/cadastro | público | Criar conta (RF01) |
| POST | /api/auth/login | público | Autenticar (RF02) |
| GET, POST | /api/registros | aluno | Listar e criar registros (RF03, RF04) |
| PUT | /api/registros/:id | aluno | Editar registro (RF04) |
| GET | /api/dashboard | aluno | Indicadores e dados do gráfico (RF05, RF06) |
| GET, POST | /api/relatorios | aluno | Listar e gerar relatórios (RF07) |
| POST | /api/relatorios/:id/compartilhar | aluno | Compartilhar relatório (RF09) |
| GET | /api/relatorios/:id/pdf | aluno ou profissional autorizado | Obter o PDF |
| GET, POST | /api/vinculos | aluno | Listar e convidar profissionais (RF08) |
| PATCH | /api/vinculos/:id | aluno | Autorizar ou revogar (RF08) |
| GET | /api/profissional/alunos | profissional | Alunos que autorizaram (RF10) |
| GET | /api/profissional/alunos/:id/dashboard | profissional | Indicadores do aluno (RF10) |
| GET | /api/profissional/alunos/:id/registros | profissional | Registros do aluno (RF10) |
| GET | /api/profissional/relatorios | profissional | Relatórios recebidos (RF10) |

## 5. Modelo de dados

O modelo relacional possui sete tabelas.

| Tabela | Finalidade |
|---|---|
| `usuario` | Contas de alunos e profissionais, com hash da senha |
| `profissional` | Perfil complementar do profissional (especialidade) |
| `registro_diario` | Registro de treino, alimentação e observação por data |
| `vinculo` | Relação aluno-profissional com estado (pendente, autorizado, revogado) e datas |
| `relatorio` | Relatórios gerados, com indicadores do período |
| `relatorio_compartilhado` | Registro de cada compartilhamento de relatório com um vínculo |
| `meta` | Metas do usuário (reservada para a versão seguinte) |

Decisões de modelagem relevantes:

- A restrição única em `(usuario_id, data)` impõe a RN01 no próprio banco.
- A restrição de verificação em `registro_diario` impede duração de treino quando não houve ida à academia (RN02).
- A alimentação é um campo com valores fixos, o que permite calcular o indicador da RN04.
- O `vinculo` é a única ligação entre aluno e profissional, e um relatório só chega a um profissional por meio de um vínculo existente.

O script completo está em `db/schema.sql`.

## 6. Segurança e privacidade

Por tratar informações relacionadas à saúde, que a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) classifica como dados pessoais sensíveis, a segurança foi considerada desde a concepção.

| Aspecto | Medida adotada |
|---|---|
| Autenticação | Senhas armazenadas apenas como hash (bcrypt); sessão por token JWT com validade de sete dias |
| Autorização | Verificação de perfil e de vínculo autorizado no servidor, em toda rota que lê dados de um aluno |
| Consentimento | O compartilhamento só ocorre após autorização do aluno, que pode revogá-la a qualquer momento |
| Minimização | Coleta restrita ao necessário: sem diagnósticos, medidas clínicas ou documentos |
| Injeção de SQL | Consultas parametrizadas em todo o acesso ao banco |
| Transporte | Tráfego protegido por HTTPS na hospedagem |
| Segredos | Credenciais fora do código-fonte e excluídas do controle de versão |

O sistema tem caráter organizacional: não realiza avaliação, diagnóstico nem prescrição.

## 7. Limitações

- Não há limitação de tentativas de login.
- O titular ainda não pode exportar nem excluir todos os seus dados pela interface.
- Não há testes automatizados da API.
- A recuperação de senha e a confirmação de e-mail não foram implementadas.
- Na hospedagem gratuita, o serviço pode demorar alguns segundos para responder após um período sem acessos.

## 8. Trabalhos futuros

- Metas de registro e frequência, com acompanhamento de conclusão.
- Notificações e lembretes de registro.
- Comparativos entre períodos.
- Exportação e exclusão de dados pelo titular, em conformidade com a LGPD.
- Limitação de tentativas de login e recuperação de senha.
- Testes automatizados.

## 9. Relação com o Projeto de Extensão III

O projeto parte da análise de uma situação-problema real, identifica os atores e os fatores envolvidos e propõe uma solução de software que automatiza o registro e o compartilhamento de informações. Ele mobiliza competências de modelagem de sistemas, desenvolvimento de software, banco de dados, segurança da informação, geração automatizada de relatórios, documentação e comunicação.

## 10. Documentação complementar

A modelagem completa (requisitos funcionais e não funcionais, regras de negócio, casos de uso, diagrama de casos de uso, diagrama entidade-relacionamento e dicionário de dados) está no documento "HealthTrack: Modelagem e Documentação" que acompanha este projeto.
