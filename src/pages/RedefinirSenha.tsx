import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export function RedefinirSenhaPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (!hashParams.get('type')?.includes('recovery')) {
      // Not a recovery flow
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo_aviva.png" alt="Igreja AVIVA" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-display">Nova Senha</h1>
        </div>
        <form onSubmit={handleUpdate} className="section-card space-y-4">
          <div>
            <Label className="form-label">Nova senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <KeyRound className="w-4 h-4" />
            {loading ? 'Atualizando...' : 'Redefinir senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
