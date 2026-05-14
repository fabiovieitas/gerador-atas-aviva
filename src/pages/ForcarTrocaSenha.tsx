
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, Key, ShieldCheck, LogOut } from "lucide-react";

export function ForcarTrocaSenhaPage() {
  const { profile, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // 1. Atualiza a senha no Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Remove o flag de troca obrigatória no perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ force_password_change: false })
        .eq("id", profile?.id);

      if (profileError) throw profileError;

      toast.success("Senha atualizada com sucesso! Você já pode acessar o sistema.");
      
      // Recarregar para limpar o estado global e liberar o acesso
      window.location.href = "/";
    } catch (error: any) {
      toast.error("Erro ao atualizar senha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">Segurança Obrigatória</CardTitle>
          <CardDescription>
            Sua senha foi resetada por um administrador. <br />
            <strong>É obrigatório criar uma nova senha</strong> para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="new-password" 
                  type="password" 
                  className="pl-10"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="confirm-password" 
                  type="password" 
                  className="pl-10"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full gap-2 h-11" disabled={loading}>
              {loading ? "Atualizando..." : <><ShieldCheck className="w-5 h-5" /> Definir Nova Senha</>}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-muted-foreground" 
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair do Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
