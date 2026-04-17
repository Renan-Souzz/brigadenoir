import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve('.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding data test for Relatorio...');
  
  // Create some PAX data
  const dateStr = new Date().toISOString().split('T')[0];
  await supabase.from('daily_pax').upsert({
    date: dateStr,
    lunch_pax: 80,
    dinner_pax: 110
  });

  // Create an Insumo that is running low
  await supabase.from('insumos').upsert({
    id: 'test-insumo-1',
    name: 'Manteiga',
    quantity: 1,
    unit: 'Kg',
    station: 'saucier',
    status: 'Estável'
  });

  // Create a pending task
  await supabase.from('tasks').upsert({
    id: 'test-task-1',
    title: 'Limpar coifa',
    station: 'garde_manger',
    is_completed: false,
    priority: 'high'
  });

  console.log('Done!');
}

seed().catch(console.error);
