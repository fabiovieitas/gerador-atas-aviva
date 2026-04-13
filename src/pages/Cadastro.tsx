import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export function CadastroPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invite, setInvite] = useState<{ nome: string; email: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Link de convite inválido.');
      setValidating(false);
      return;
    }

    // Validate invite token
    supabase
      .from('invites')
      .select('nome, email, used, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Convite não encontrado.');
        } else if (data.used) {
          setError('Este convite já foi utilizado.');
        } else if (new Date(data.expires_at) < new Date()) {
          setError('Este convite expirou. Solicite um novo.');
        } else {
          setInvite({ nome: data.nome, email: data.email });
        }
        setValidating(false);
      });
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('register-invite', {
      body: { token, password },
    });

    if (fnError || data?.error) {
      toast.error(data?.error || 'Erro ao criar conta.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md section-card text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Convite Inválido</h2>
          <p className="text-muted-foreground">{error}</p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Ir para login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md section-card text-center space-y-4">
          <UserPlus className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Conta criada!</h2>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso. Agora você pode fazer login.
          </p>
          <Button onClick={() => navigate('/login')} className="mt-4">Ir para login</Button>
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

        <form onSubmit={handleRegister} className="section-card space-y-4">
          <div>
            <Label className="form-label">Nome</Label>
            <Input value={invite?.nome || ''} disabled className="bg-muted" />
          </div>
          <div>
            <Label className="form-label">Email</Label>
            <Input value={invite?.email || ''} disabled className="bg-muted" />
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
          <div>
            <Label className="form-label">Confirmar Senha</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <UserPlus className="w-4 h-4" />
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
