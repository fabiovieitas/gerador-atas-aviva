
import { createClient } from '@supabase/supabase-client'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkBackupLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(nome)')
    .eq('action', 'Backup Realizado')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('Últimos logs de backup:');
  console.log(JSON.stringify(data, null, 2));
}

checkBackupLogs();
