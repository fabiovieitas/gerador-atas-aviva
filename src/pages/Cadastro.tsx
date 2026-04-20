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

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invite, setInvite] = useState<{ nome: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    // 1. Verifica se o sistema tem usuários
    supabase.from('profiles').select('*', { count: 'exact', head: true }).then(({ count, error: countErr }) => {
      if (!countErr && count === 0) {
        // Primeiro Acesso! Libera para criar Master sem convite
        setIsFirstUser(true);
        setValidating(false);
      } else {
        // Já tem gente. Exige o convite!
        if (!token) {
          setError('O sistema é restrito a convidados. Solicite um link de convite.');
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
      }
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

    const emailToUse = isFirstUser ? email : invite?.email;
    const nomeToUse = isFirstUser ? nome : invite?.nome;

    if (!emailToUse || !nomeToUse) {
      toast.error('Preencha nome e email.');
      return;
    }

    setLoading(true);
    
    // Usando SignUp padrão
    const { error: signUpError } = await supabase.auth.signUp({
      email: emailToUse,
      password,
      options: {
        data: {
          nome: nomeToUse,
        }
      }
    });

    if (signUpError) {
      toast.error(signUpError.message);
      setLoading(false);
      return;
    }

    // Se usou convite, marca como utilizado
    if (!isFirstUser && token) {
      await supabase.from('invites').update({ used: true }).eq('token', token);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Validando sistema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md section-card text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
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
          <h2 className="text-xl font-bold text-foreground">Conta criada com sucesso!</h2>
          <p className="text-muted-foreground">
            {isFirstUser 
              ? "Você é o Master do sistema. Sua igreja foi inicializada." 
              : "Sua conta foi ativada. Agora você pode fazer login."}
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
          <h1 className="text-2xl font-bold text-foreground font-display">
            {isFirstUser ? "Configuração Inicial (Master)" : "Criar Conta"}
          </h1>
          {isFirstUser && (
            <p className="text-sm text-muted-foreground mt-2">
              Seja bem-vindo(a). Crie a primeira conta para assumir a administração do sistema.
            </p>
          )}
        </div>

        <form onSubmit={handleRegister} className="section-card space-y-4">
          <div>
            <Label className="form-label">Nome</Label>
            <Input 
              value={isFirstUser ? nome : (invite?.nome || '')} 
              onChange={e => isFirstUser && setNome(e.target.value)}
              disabled={!isFirstUser} 
              className={!isFirstUser ? "bg-muted" : ""} 
              placeholder={isFirstUser ? "Seu nome completo" : ""}
              required 
            />
          </div>
          <div>
            <Label className="form-label">Email</Label>
            <Input 
              type="email"
              value={isFirstUser ? email : (invite?.email || '')} 
              onChange={e => isFirstUser && setEmail(e.target.value)}
              disabled={!isFirstUser} 
              className={!isFirstUser ? "bg-muted" : ""} 
              placeholder={isFirstUser ? "seu@email.com" : ""}
              required 
            />
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
            {loading ? 'Processando...' : (isFirstUser ? 'Criar Sistema' : 'Criar minha conta')}
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
