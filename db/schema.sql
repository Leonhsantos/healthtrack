-- HealthTrack - modelo de dados (PostgreSQL). Pode rodar várias vezes sem erro.

CREATE TABLE IF NOT EXISTS usuario (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  tipo        VARCHAR(15)  NOT NULL CHECK (tipo IN ('aluno', 'profissional')),
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profissional (
  id                    SERIAL PRIMARY KEY,
  usuario_id            INT NOT NULL UNIQUE REFERENCES usuario(id),
  especialidade         VARCHAR(60) NOT NULL,
  registro_profissional VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS registro_diario (
  id              SERIAL PRIMARY KEY,
  usuario_id      INT  NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  academia        BOOLEAN NOT NULL,
  duracao_minutos INT CHECK (duracao_minutos > 0),
  alimentacao     VARCHAR(15) NOT NULL
                  CHECK (alimentacao IN ('seguiu', 'parcial', 'nao_seguiu')),
  observacao      TEXT,
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, data),
  CHECK (academia OR duracao_minutos IS NULL)
);

CREATE TABLE IF NOT EXISTS vinculo (
  id              SERIAL PRIMARY KEY,
  aluno_id        INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  profissional_id INT NOT NULL REFERENCES profissional(id) ON DELETE CASCADE,
  status          VARCHAR(12) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'autorizado', 'revogado')),
  solicitado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  autorizado_em   TIMESTAMP,
  revogado_em     TIMESTAMP,
  UNIQUE (aluno_id, profissional_id)
);

CREATE TABLE IF NOT EXISTS relatorio (
  id                  SERIAL PRIMARY KEY,
  aluno_id            INT  NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  periodo_inicio      DATE NOT NULL,
  periodo_fim         DATE NOT NULL,
  treinos             INT  NOT NULL,
  dias_registrados    INT  NOT NULL,
  dias_seguindo_plano INT  NOT NULL,
  gerado_em           TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (periodo_fim >= periodo_inicio)
);

CREATE TABLE IF NOT EXISTS relatorio_compartilhado (
  id               SERIAL PRIMARY KEY,
  relatorio_id     INT NOT NULL REFERENCES relatorio(id) ON DELETE CASCADE,
  vinculo_id       INT NOT NULL REFERENCES vinculo(id) ON DELETE CASCADE,
  compartilhado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (relatorio_id, vinculo_id)
);

-- Versão 2 (ainda sem telas)
CREATE TABLE IF NOT EXISTS meta (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  descricao  VARCHAR(200) NOT NULL,
  periodo    VARCHAR(20)  NOT NULL,
  concluida  BOOLEAN NOT NULL DEFAULT FALSE
);
