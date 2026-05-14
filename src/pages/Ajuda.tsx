import { 
  HelpCircle, 
  QrCode, 
  FileText, 
  Database, 
  MessageCircle, 
  AtSign, 
  Download, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AjudaPage() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id,
        church_id: profile?.church_id,
        subject,
        message,
        status: 'aberto',
        user_nome: profile?.nome,
        user_email: profile?.email
      });

      if (error) throw error;

      toast.success("Chamado enviado com sucesso! Aguarde a resposta no seu Dashboard.");
      setOpen(false);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Erro ao salvar ticket:", err);
      toast.error("Erro ao enviar chamado. Verifique se o banco de dados está pronto.");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: "Presença Digital (QR Code)",
      icon: QrCode,
      content: (
        <ul className="space-y-3">
          <li className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">1</div>
            <p className="text-sm text-muted-foreground">Na aba <strong>Presença</strong> da nova ata, clique em <strong>"Abrir QR Code"</strong>.</p>
          </li>
          <li className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">2</div>
            <p className="text-sm text-muted-foreground">O 2º secretário escaneia o código com a câmera do celular (não precisa baixar aplicativo).</p>
          </li>
          <li className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">3</div>
            <p className="text-sm text-muted-foreground">À medida que ele marca os nomes no celular, o site no computador atualiza <strong>na hora</strong>.</p>
          </li>
          <li className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
            <p className="text-xs text-amber-700 italic">Dica: Você pode mudar de aba e continuar escrevendo a ata enquanto ele marca as presenças pelo celular.</p>
          </li>
        </ul>
      )
    },
    {
      title: "Dicas de Redação",
      icon: FileText,
      content: (
        <ul className="space-y-3">
          <li className="flex gap-3">
            <AtSign className="w-4 h-4 text-primary shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">Digite <strong>@</strong> em qualquer campo de texto para abrir a lista de membros e citá-los rapidamente.</p>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">O sistema escreve automaticamente <strong>datas, valores e horários por extenso</strong> seguindo o padrão das Atas Oficiais.</p>
          </li>
          <li className="flex gap-3">
            <Download className="w-4 h-4 text-blue-500 shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">Após gerar a ata, use o botão <strong>"Baixar Word"</strong> para exportar com a formatação correta (Calibri 13pt).</p>
          </li>
        </ul>
      )
    },
    {
      title: "Segurança e Backup",
      icon: Database,
      content: (
        <ul className="space-y-3">
          <li className="flex gap-3">
            <p className="text-sm text-muted-foreground">O sistema salva <strong>rascunhos automáticos</strong> no seu navegador. Se você fechar a página sem querer, o sistema perguntará se deseja continuar de onde parou.</p>
          </li>
          <li className="flex gap-3">
            <p className="text-sm text-muted-foreground">No menu <strong>Backup</strong>, você pode baixar um arquivo com todos os dados da sua igreja para guardar em local seguro.</p>
          </li>
        </ul>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-muted-foreground">Tudo o que você precisa para dominar o Gerador de Atas AVIVA.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section.title} className="section-card space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <section.icon className="w-5 h-5" />
              <h2 className="font-bold text-sm uppercase tracking-wider">{section.title}</h2>
            </div>
            {section.content}
          </div>
        ))}
      </div>

      <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 text-center space-y-4">
        <h3 className="text-xl font-bold">Precisa de suporte?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Envie uma mensagem direta para a administração do sistema através do chamado interno.
        </p>
        <div className="pt-2">
          <Button 
            size="lg" 
            onClick={() => setOpen(true)}
            className="px-8 py-6 text-lg rounded-2xl shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
          >
            Abrir Chamado de Suporte
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <MessageCircle className="w-6 h-6 text-primary" />
                    Novo Chamado
                  </DialogTitle>
                  <DialogDescription>
                    O administrador responderá diretamente no seu Dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Assunto</label>
                    <select 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full h-12 rounded-xl border border-primary/20 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Selecione o tipo de chamado</option>
                      <option value="Dúvida / Ajuda">❓ Dúvida / Ajuda</option>
                      <option value="Sugestão">💡 Sugestão de Melhoria</option>
                      <option value="Erro / Bug">⚠️ Erro ou Problema Técnico</option>
                      <option value="Outro">📝 Outro Assunto</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Mensagem Detalhada</label>
                    <Textarea 
                      placeholder="Conte-nos o que aconteceu..." 
                      className="min-h-[150px] rounded-xl border-primary/20 resize-none"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-md font-bold gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Enviar Chamado
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
