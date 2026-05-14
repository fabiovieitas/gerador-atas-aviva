import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  FileText, 
  Trash2, 
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScheduledMeeting {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  status: string;
  church_id: string;
  churches?: { nome: string };
}

export function AgendaPage() {
  const { isAdmin, isMaster, profile } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [profile?.church_id]);

  const fetchMeetings = async () => {
    if (!profile?.church_id && !isMaster) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("meeting_schedule")
        .select("*, churches(nome)")
        .order("scheduled_at", { ascending: true });

      if (!isMaster) {
        query = query.eq('church_id', profile?.church_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setMeetings(data as any);
    } catch (error: any) {
      toast.error("Erro ao carregar agenda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeeting = async () => {
    if (!title || !date || !time) {
      toast.error("Preencha o título, data e hora.");
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = `${date}T${time}:00`;
      
      const { error } = await supabase
        .from('meeting_schedule')
        .insert({
          title,
          description,
          scheduled_at: scheduledAt,
          church_id: profile?.church_id,
          created_by: profile?.user_id
        });

      if (error) throw error;

      toast.success("Reunião agendada!");
      setIsAddOpen(false);
      resetForm();
      fetchMeetings();
    } catch (error: any) {
      toast.error("Erro ao agendar: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja cancelar esta reunião?")) return;
    try {
      await supabase.from('meeting_schedule').delete().eq('id', id);
      toast.success("Reunião removida.");
      fetchMeetings();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const handleStartAta = (meeting: ScheduledMeeting) => {
    // Pass meeting data to Nova Ata page via state
    navigate('/nova-ata', { 
      state: { 
        preFill: {
          dataReuniao: meeting.scheduled_at.split('T')[0],
          horaInicio: meeting.scheduled_at.split('T')[1].substring(0, 5),
          assuntosPrincipais: meeting.description,
          tipoAssembleia: meeting.title.includes('Extraordinária') ? 'Extraordinária' : 'Ordinária'
        }
      } 
    });
    toast.info("Dados da agenda carregados no editor!");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr.startsWith(today);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-primary" />
            Agenda de Assembleias
          </h1>
          <p className="text-muted-foreground mt-1">
            Planeje suas reuniões e defina as pautas com antecedência.
          </p>
        </div>

        {(isAdmin || isMaster) && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Agendar Reunião
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Reunião</DialogTitle>
                <DialogDescription>
                  Defina a data e os assuntos que serão tratados.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título da Reunião</label>
                  <Input 
                    placeholder="Ex: Assembleia Geral Ordinária" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Horário</label>
                    <Input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pauta / Assuntos (Será usado na Ata)</label>
                  <Textarea 
                    placeholder="Descreva os tópicos que serão discutidos..." 
                    className="min-h-[100px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddMeeting} disabled={submitting} className="gap-2">
                  {submitting ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <div 
              key={meeting.id} 
              className={`group relative bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row ${isToday(meeting.scheduled_at) ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}
            >
              {isToday(meeting.scheduled_at) && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              )}
              
              <div className="p-6 flex-1 flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center justify-center bg-muted/50 rounded-xl p-4 min-w-[100px] h-fit">
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    {new Date(meeting.scheduled_at).toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                  <span className="text-3xl font-display font-black text-primary">
                    {new Date(meeting.scheduled_at).getDate()}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(meeting.scheduled_at).getFullYear()}
                  </span>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xl">{meeting.title}</h3>
                    {isToday(meeting.scheduled_at) && (
                      <Badge className="bg-primary text-primary-foreground animate-pulse">HOJE</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary/60" />
                      {new Date(meeting.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                    </div>
                    {meeting.churches && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary/60" />
                        {meeting.churches.nome}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed mt-3">
                    <strong>Pauta:</strong> {meeting.description || "Nenhuma pauta definida."}
                  </p>
                </div>

                <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                  <Button 
                    className="gap-2 bg-success hover:bg-success/90 text-white shadow-sm"
                    onClick={() => handleStartAta(meeting)}
                  >
                    <FileText className="w-4 h-4" /> Iniciar Ata
                  </Button>
                  
                  {(isAdmin || isMaster) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(meeting.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 bg-card rounded-3xl border border-dashed">
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto text-muted-foreground/40">
              <CalendarIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-xl">Nenhuma reunião agendada</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">Tudo calmo por aqui. Que tal planejar a próxima assembleia?</p>
            </div>
            {(isAdmin || isMaster) && (
              <Button variant="outline" onClick={() => setIsAddOpen(true)} className="mt-4">
                Agendar Agora
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-4">
        <div className="p-2 bg-blue-100 rounded-full text-blue-600 shrink-0 h-fit">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-blue-800">Dica de Produtividade</h4>
          <p className="text-xs text-blue-700 leading-relaxed mt-1">
            Ao clicar em <strong>"Iniciar Ata"</strong>, o sistema levará você para o gerador e preencherá automaticamente a data e a pauta da reunião. 
            Isso garante que nada do que foi planejado fique de fora do registro oficial.
          </p>
        </div>
      </div>
    </div>
  );
}
