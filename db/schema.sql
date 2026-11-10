-- Pode ser colado no SQL Editor do Supabase (o servidor também roda isso ao iniciar)

-- CS 1.6: equipes de 5
CREATE TABLE IF NOT EXISTS teams (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(40) NOT NULL UNIQUE,
  pin        VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id       SERIAL PRIMARY KEY,
  team_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name     VARCHAR(60) NOT NULL,
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 12)
);
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team_id);

-- Mortal Kombat 1 e FIFA 26: inscrição individual
CREATE TABLE IF NOT EXISTS players (
  id         SERIAL PRIMARY KEY,
  game       VARCHAR(20) NOT NULL,
  name       VARCHAR(60) NOT NULL,
  age        SMALLINT NOT NULL CHECK (age BETWEEN 5 AND 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_players_game_name ON players (game, lower(name));

-- Sorteio de confrontos (player2_id vazio = folga)
CREATE TABLE IF NOT EXISTS matches (
  id         SERIAL PRIMARY KEY,
  game       VARCHAR(20) NOT NULL,
  position   SMALLINT NOT NULL,
  player1_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id INTEGER REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_matches_game ON matches(game);

-- Status do confronto: 'pending' (pendente) ou 'done' (concluído)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'pending';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- Chaveamento por rodadas (v4): vale para jogadores (MK1/FIFA 26) e equipes (CS 1.6)
ALTER TABLE matches ALTER COLUMN player1_id DROP NOT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team1_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team2_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner SMALLINT CHECK (winner IN (1, 2)); -- lado vencedor
-- folgas antigas passam a ser "concluídas" (o participante avança direto)
UPDATE matches SET status = 'done', winner = 1 WHERE status = 'pending' AND player2_id IS NULL AND team2_id IS NULL;

-- ===== v5: histórico permanente das partidas =====
ALTER TABLE matches ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;   -- preenchido ao clicar em "Reiniciar"
ALTER TABLE matches ADD COLUMN IF NOT EXISTS side1_name VARCHAR(60);    -- nomes gravados na hora do sorteio
ALTER TABLE matches ADD COLUMN IF NOT EXISTS side2_name VARCHAR(60);    -- (vazio = folga)

-- preenche os nomes de partidas antigas
UPDATE matches m SET side1_name = COALESCE((SELECT name FROM players WHERE id = m.player1_id), (SELECT name FROM teams WHERE id = m.team1_id))
 WHERE side1_name IS NULL;
UPDATE matches m SET side2_name = COALESCE((SELECT name FROM players WHERE id = m.player2_id), (SELECT name FROM teams WHERE id = m.team2_id))
 WHERE side2_name IS NULL AND (player2_id IS NOT NULL OR team2_id IS NOT NULL);

-- excluir um jogador/equipe não apaga mais o histórico (a referência vira NULL, o nome fica gravado)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_player1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_player2_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team2_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD CONSTRAINT matches_team1_id_fkey   FOREIGN KEY (team1_id)   REFERENCES teams(id)   ON DELETE SET NULL;
ALTER TABLE matches ADD CONSTRAINT matches_team2_id_fkey   FOREIGN KEY (team2_id)   REFERENCES teams(id)   ON DELETE SET NULL;

-- visão para consultas/estatísticas: todas as partidas realizadas (atuais e arquivadas)
CREATE OR REPLACE VIEW match_history AS
SELECT m.id, m.game, m.round, m.side1_name, m.side2_name,
       CASE m.winner WHEN 1 THEN m.side1_name WHEN 2 THEN m.side2_name END AS winner_name,
       m.finished_at, m.archived_at
FROM matches m
WHERE m.status = 'done' AND m.side2_name IS NOT NULL;

-- ===== v7: abrir/encerrar inscrições por jogo =====
CREATE TABLE IF NOT EXISTS game_settings (
  game              VARCHAR(20) PRIMARY KEY,
  registration_open BOOLEAN NOT NULL DEFAULT true
);
