-- ─── Roles e Permissões ────────────────────────────────────────────────────────

-- Adiciona o novo role ao enum (PostgreSQL permite isso fora de transações)
-- NOTA: Se rodar em script, certifique-se que o Supabase aceita ALTER TYPE.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ficha_tecnica';

-- ─── Tabelas do Módulo Ficha Técnica (ft_) ───────────────────────────────────

-- Tabela de Insumos Técnicos
CREATE TABLE ft_insumos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade_base TEXT NOT NULL CHECK (unidade_base IN ('g', 'ml', 'un')),
  preco_compra DECIMAL(10,2) NOT NULL,
  quantidade_compra DECIMAL(10,3) NOT NULL,
  unidade_compra TEXT NOT NULL, -- Ex: 'kg', 'L', 'caixa pronto'
  preco_unitario_base DECIMAL(10,5) GENERATED ALWAYS AS (
    CASE 
      WHEN unidade_compra ILIKE 'kg' THEN preco_compra / (quantidade_compra * 1000)
      WHEN unidade_compra ILIKE 'l' THEN preco_compra / (quantidade_compra * 1000)
      ELSE preco_compra / quantidade_compra
    END
  ) STORED,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Tabela de Fichas Técnicas
CREATE TABLE ft_fichas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  rendimento_total DECIMAL(10,3) NOT NULL DEFAULT 1,
  modo_preparo TEXT,
  cmv_ideal DECIMAL(10,2) DEFAULT 30, -- Em porcentagem
  preco_venda DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Itens da Ficha (Ingredientes)
CREATE TABLE ft_ficha_ingredientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID REFERENCES ft_fichas(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES ft_insumos(id),
  pb_gramas DECIMAL(10,3) NOT NULL, -- Peso Bruto sempre em gramas/ml/un
  fc DECIMAL(10,2) DEFAULT 1,      -- Fator de Correção
  ir DECIMAL(10,2) DEFAULT 1,      -- Índice de Rendimento
  ia DECIMAL(10,2) DEFAULT 1,      -- Índice de Absorsão
  icd DECIMAL(10,2) DEFAULT 1,     -- Índice de Congelamento/Descongelamento
  auto_calculate_pl BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alérgenos
CREATE TABLE ft_alergenicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL
);

-- Relação Insumo <-> Alérgenos
CREATE TABLE ft_insumo_alergenicos (
  insumo_id UUID REFERENCES ft_insumos(id) ON DELETE CASCADE,
  alergenico_id UUID REFERENCES ft_alergenicos(id) ON DELETE CASCADE,
  PRIMARY KEY (insumo_id, alergenico_id)
);

-- Complementos da Ficha
CREATE TABLE ft_ficha_complementos (
  ficha_id UUID REFERENCES ft_fichas(id) ON DELETE CASCADE PRIMARY KEY,
  validade_dias INTEGER,
  conservacao TEXT,
  contem_gluten BOOLEAN DEFAULT FALSE,
  contem_lactose BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);

-- ─── Funções de Cálculo (Backend) ─────────────────────────────────────────────

-- Calcula o Peso Líquido Final aplicando todos os fatores sequencialmente
CREATE OR REPLACE FUNCTION fn_ft_calcular_pl_final(
  pb DECIMAL, 
  fc DECIMAL, 
  ir DECIMAL, 
  ia DECIMAL, 
  icd DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Ordem: PB -> FC (PL) -> IR -> IA -> ICD
  RETURN pb * fc * ir * ia * icd;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calcula o custo de um item da ficha
CREATE OR REPLACE VIEW vw_ft_ficha_detalhes AS
SELECT 
  fi.*,
  i.nome as insumo_nome,
  i.preco_unitario_base,
  fn_ft_calcular_pl_final(fi.pb_gramas, fi.fc, fi.ir, fi.ia, fi.icd) as pl_final,
  (fi.pb_gramas * i.preco_unitario_base) as custo_item -- Custo baseia-se no PB (o que foi comprado)
FROM ft_ficha_ingredientes fi
JOIN ft_insumos i ON fi.insumo_id = i.id;

-- ─── RLS e Segurança ─────────────────────────────────────────────────────────

ALTER TABLE ft_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ft_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ft_ficha_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ft_alergenicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ft_insumo_alergenicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ft_ficha_complementos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "FT read access" ON ft_insumos FOR SELECT USING (true);
CREATE POLICY "FT manage access" ON ft_insumos FOR ALL 
  USING (auth.get_role() IN ('admin', 'ficha_tecnica'));

CREATE POLICY "Fichas read access" ON ft_fichas FOR SELECT USING (true);
CREATE POLICY "Fichas manage access" ON ft_fichas FOR ALL 
  USING (auth.get_role() IN ('admin', 'ficha_tecnica'));

CREATE POLICY "Ingredientes manage access" ON ft_ficha_ingredientes FOR ALL 
  USING (auth.get_role() IN ('admin', 'ficha_tecnica'));

-- Bloqueio do role ficha_tecnica em tabelas operacionais (Exemplo de ajuste em tabelas existentes)
-- Nota: As políticas existentes já verificam roles específicos. 
-- O role 'ficha_tecnica' não está nessas listas, então já está bloqueado por padrão (RLS denega se não houver política permitindo).

-- ─── Seed Inicial Alergenos ──────────────────────────────────────────────────
INSERT INTO ft_alergenicos (nome) VALUES 
  ('Trigo'), ('Centeio'), ('Cevada'), ('Aveia'), ('Ovos'), ('Peixes'), 
  ('Crustáceos'), ('Amendoim'), ('Soja'), ('Leite'), ('Amêndoa'), 
  ('Avelãs'), ('Castanha-de-caju'), ('Castanha-do-pará'), ('Macadâmias'), 
  ('Nozes'), ('Pecãs'), ('Pistaches'), ('Pinoli'), ('Castanhas');
