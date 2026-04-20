import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos.'
        : error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo_aviva.png" alt="Igreja AVIVA" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-display">Gerador de Atas</h1>
          <p className="text-muted-foreground text-sm mt-1">Igreja Evangélica AVIVA</p>
        </div>

        <form onSubmit={handleLogin} className="section-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">Entrar</h2>

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
                placeholder="Sua senha"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="w-4 h-4" />
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="text-center space-y-2 mt-4">
            <Link to="/esqueci-senha" className="text-sm text-primary hover:underline block">
              Esqueci minha senha
            </Link>
            <div className="text-sm text-muted-foreground mt-4 border-t pt-4">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
