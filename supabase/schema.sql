-- ─── Cleanup Atualizado ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_user_metadata();

-- Usamos CASCADE para evitar erros de dependência entre tabelas
DROP TABLE IF EXISTS modo_preparo_stations CASCADE;
DROP TABLE IF EXISTS modos_preparo CASCADE;
DROP TABLE IF EXISTS dishes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS invitation_codes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS daily_pax CASCADE;

DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS kitchen_station CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS item_status CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;


-- ─── Types & Enums ─────────────────────────────────────────────────────────────

-- Roles da Brigada (Níveis de Acesso)
CREATE TYPE app_role AS ENUM (
  'admin',
  'chef_executivo',
  'chef_de_cuisine', 
  'sous_chef', 
  'chef_de_partie', 
  'commis'
);

-- Praças da Cozinha
CREATE TYPE kitchen_station AS ENUM (
  'saucier', 
  'garde_manger', 
  'entremetier', 
  'rotisseur', 
  'poissonier', 
  'patissier',
  'lideranca',
  'almoxarifado'
);

-- Prioridade de Tarefas
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high');

-- Status de Tarefas
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived', 'expired');

-- Status de Insumos
CREATE TYPE item_status AS ENUM ('stable', 'warning', 'critical', 'expired');

-- Turnos
CREATE TYPE shift_type AS ENUM ('manha', 'tarde', 'todos');


-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Praças (Tabela de Referência)
CREATE TABLE stations (
  id kitchen_station PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT
);

-- Perfis de Usuários
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role app_role DEFAULT 'commis',
  station kitchen_station NOT NULL DEFAULT 'saucier',
  avatar_url TEXT,
  shift shift_type DEFAULT 'manha',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convites para Novos Membros
CREATE TABLE invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  role app_role NOT NULL,
  created_by UUID REFERENCES auth.users,
  used_by UUID REFERENCES auth.users,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modos de Preparo (Fichas Técnicas)
CREATE TABLE modos_preparo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'Entrada', 'Prato Principal', 'Sobremesa'
  passos TEXT[] NOT NULL DEFAULT '{}',
  ticket_avg TEXT DEFAULT '15min',
  status TEXT DEFAULT 'Ativo',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Cardápio (Itens de Venda/Serviço)
CREATE TABLE dishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  praca_responsavel kitchen_station NOT NULL DEFAULT 'saucier',
  porcoes INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Tabela de Junção: Modos de Preparo <-> Praças (Normalização Multi-Praça)
CREATE TABLE modo_preparo_stations (
  modo_id UUID REFERENCES modos_preparo(id) ON DELETE CASCADE,
  station kitchen_station REFERENCES stations(id) ON DELETE CASCADE,
  PRIMARY KEY (modo_id, station)
);

-- Insumos (Estoque da Praça)
CREATE TABLE insumos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  station kitchen_station NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  status item_status DEFAULT 'stable',
  expiry_date DATE,
  last_prep_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Tarefas (Checklist de Produção)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  station kitchen_station NOT NULL,
  priority task_priority DEFAULT 'normal',
  status task_status DEFAULT 'pending',
  shift shift_type DEFAULT 'manha',
  is_completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAX (Controle de Movimento)
CREATE TABLE daily_pax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  lunch_pax INTEGER DEFAULT 0,
  dinner_pax INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Notificações
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  station kitchen_station,
  user_id UUID REFERENCES auth.users,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ─── Indices e Performance ────────────────────────────────────────────────────

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_station ON profiles(station);
CREATE INDEX idx_tasks_station_status ON tasks(station, status, is_archived);
CREATE INDEX idx_tasks_shift_date ON tasks(shift, created_at);
CREATE INDEX idx_insumos_station ON insumos(station);
CREATE INDEX idx_insumos_expiry ON insumos(expiry_date);
CREATE INDEX idx_modos_preparo_nome ON modos_preparo(nome);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_dishes_praca ON dishes(praca_responsavel);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);


-- ─── RLS: Otimização via JWT Metadata ─────────────────────────────────────────

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE modos_preparo ENABLE ROW LEVEL SECURITY;
ALTER TABLE modo_preparo_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pax ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper Function para acessar Metadata do JWT de forma limpa
CREATE OR REPLACE FUNCTION auth.get_role() RETURNS text AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
    'commis'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.get_station() RETURNS text AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'station');
$$ LANGUAGE sql STABLE;

-- Profiles Policies
CREATE POLICY "Profiles readable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own metadata" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Managers can update any profile" ON profiles FOR UPDATE 
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

-- Invitation Codes
CREATE POLICY "Management can manage invites" ON invitation_codes FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine'));

-- Modos de Preparo
CREATE POLICY "Recipes readable by everyone" ON modos_preparo FOR SELECT USING (true);
CREATE POLICY "Management can manage recipes" ON modos_preparo FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

CREATE POLICY "Junction table readable by everyone" ON modo_preparo_stations FOR SELECT USING (true);
CREATE POLICY "Management can manage junction table" ON modo_preparo_stations FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

-- Dishes (Menu Items)
CREATE POLICY "Dishes readable by everyone" ON dishes FOR SELECT USING (true);
CREATE POLICY "Managers can manage dishes" ON dishes FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));
CREATE POLICY "Station workers can update portions" ON dishes FOR UPDATE
  USING (praca_responsavel::text = auth.get_station());

-- Insumos (Otimizado por Station)
CREATE POLICY "Managers can do everything on insumos" ON insumos FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

CREATE POLICY "Station workers can manage their insumos" ON insumos FOR ALL
  USING (station::text = auth.get_station());

-- Tasks (Otimizado por Station)
CREATE POLICY "Managers can do everything on tasks" ON tasks FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

CREATE POLICY "Station workers can manage their tasks" ON tasks FOR ALL
  USING (station::text = auth.get_station());

-- PAX
CREATE POLICY "PAX readable by everyone" ON daily_pax FOR SELECT USING (true);
CREATE POLICY "Management can manage PAX" ON daily_pax FOR ALL
  USING (auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'));

-- Notifications
CREATE POLICY "Notifications readable by user or station" ON notifications FOR SELECT
  USING (
    user_id = auth.uid() OR 
    station::text = auth.get_station() OR
    auth.get_role() IN ('admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef')
  );


-- ─── Functions & Triggers: JWT Metadata Sync ──────────────────────────────────

-- Sincroniza dados do profile para o Auth App Metadata (JWT)
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o app_metadata no auth.users para conter role e station
  -- Isso permite que o RLS funcione instantaneamente sem subqueries
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object('role', NEW.role, 'station', NEW.station)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_updated
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_metadata();

-- Trigger para criação inicial do Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_count INTEGER;
  target_role public.app_role;
  invite_row RECORD;
  selected_station public.kitchen_station;
  selected_shift public.shift_type;
  invite_code TEXT;
BEGIN
  SELECT count(*) INTO profile_count FROM public.profiles;
  
  selected_station := (new.raw_user_meta_data->>'station')::public.kitchen_station;
  selected_shift := (new.raw_user_meta_data->>'shift')::public.shift_type;
  invite_code := new.raw_user_meta_data->>'invite_code';
  
  IF profile_count = 0 THEN
    target_role := 'admin';
  ELSIF invite_code IS NOT NULL AND invite_code <> '' THEN
    SELECT * INTO invite_row FROM public.invitation_codes 
    WHERE code = invite_code AND is_used = FALSE;
    
    IF invite_row.id IS NOT NULL THEN
      target_role := invite_row.role;
      UPDATE public.invitation_codes SET is_used = TRUE, used_by = new.id WHERE id = invite_row.id;
    ELSE
      target_role := 'commis';
    END IF;
  ELSE
    target_role := 'commis';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, station, shift)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Membro'), 
    target_role,
    COALESCE(selected_station, 'saucier'),
    COALESCE(selected_shift, 'manha')
  );
  
  -- Para o primeiro login, o Supabase já terá o app_metadata atualizado pela trigger 'on_profile_updated'
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── Seed Data ───────────────────────────────────────────────────────────────

INSERT INTO stations (id, display_name, description) VALUES
  ('saucier', 'Saucier', 'Sauces, stews, and sautéed dishes'),
  ('garde_manger', 'Garde Manger', 'Cold dishes, salads, and appetizers'),
  ('entremetier', 'Entremetier', 'Vegetables, starches, and soups'),
  ('rotisseur', 'Rôtisseur', 'Roasted and braised meats'),
  ('poissonier', 'Poissonnier', 'Fish and seafood dishes'),
  ('patissier', 'Pâtissier', 'Pastry and desserts'),
  ('lideranca', 'Liderança', 'Chef Exhaustive / Executives Control'),
  ('almoxarifado', 'Almoxarifado', 'Central storage and receiving');
