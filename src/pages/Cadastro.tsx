import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success('Cadastro realizado! Verifique seu email para confirmar.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md section-card text-center space-y-4">
          <img src="/logo_aviva.png" alt="Igreja AVIVA" className="h-16 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Verifique seu email</h2>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>. 
            Clique no link para ativar sua conta.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Voltar ao login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo_aviva.png" alt="Igreja AVIVA" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-display">Criar Conta</h1>
        </div>

        <form onSubmit={handleSignup} className="section-card space-y-4">
          <div>
            <Label className="form-label">Nome completo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div>
            <Label className="form-label">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div>
            <Label className="form-label">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <UserPlus className="w-4 h-4" />
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
