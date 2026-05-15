
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Tentando atualizar a chave do Gemini no banco...");
  
  // 1. Tenta adicionar a coluna (via SQL RPC ou assumindo que já existe se rodou via dashboard)
  // Como não temos RPC de SQL fácil, vamos tentar o update direto
  
  const { data, error } = await supabase
    .from('churches')
    .update({ gemini_api_key: 'AIzaSyD02qkzJfQUD7TYo_zbQG3TGwySn1lemRQ' })
    .not('id', 'is', null);

  if (error) {
    console.error("Erro ao atualizar:", error.message);
    if (error.message.includes("column \"gemini_api_key\" does not exist")) {
      console.log("DICA: Você precisa ir no SQL Editor do Supabase e rodar: ALTER TABLE churches ADD COLUMN gemini_api_key TEXT;");
    }
  } else {
    console.log("Sucesso! Chave gravada para todas as igrejas.");
  }
}

run();
