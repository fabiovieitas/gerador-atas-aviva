import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md section-card text-center space-y-4">
          <Mail className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">Email enviado</h2>
          <p className="text-muted-foreground">Verifique sua caixa de entrada em <strong>{email}</strong>.</p>
          <Link to="/login"><Button variant="outline">Voltar ao login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo_aviva.png" alt="Igreja AVIVA" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-display">Recuperar Senha</h1>
        </div>
        <form onSubmit={handleReset} className="section-card space-y-4">
          <div>
            <Label className="form-label">Email cadastrado</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <Mail className="w-4 h-4" />
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
          <Link to="/login" className="text-sm text-primary hover:underline block text-center">Voltar ao login</Link>
        </form>
      </div>
    </div>
  );
}
