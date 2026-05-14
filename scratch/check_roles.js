
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUser() {
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  console.log('Users:', users?.map(u => ({ id: u.id, email: u.email })));
  
  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
  console.log('Roles:', roles);
}

// checkUser();
