import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Search, Loader2, XCircle, Users, CheckCheck, X, AlertCircle, Image as ImageIcon, Trash2, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Session {
  id: string;
  titulo: string;
  tipo: string;
  church_id: string;
  church_nome: string;
  church_logo?: string;
  fotos_assinatura_urls?: string[];
}

interface Membro {
  nome: string;
  cargo: string;
}

export function MarcarPresencaPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [presentes, setPresentes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"todos" | "presentes" | "ausentes">("todos");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadSession();
  }, [token]);

  // Real-time sync for attendance
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`marcar-${session.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "assembly_attendance",
        filter: `session_id=eq.${session.id}`,
      }, async () => {
        const { data } = await supabase
          .from("assembly_attendance")
          .select("membro_nome")
          .eq("session_id", session.id);
        setPresentes(data?.map((d) => d.membro_nome) || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  // Real-time sync for session details (signatures)
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`session-details-${session.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "assembly_sessions",
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        const updatedSession = payload.new as any;
        if (updatedSession) {
          setSession(prev => prev ? {
            ...prev,
            fotos_assinatura_urls: updatedSession.fotos_assinatura_urls || []
          } : null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from("assembly_sessions")
        .select("id, titulo, tipo, church_id, is_active, membros_json, church_nome, fotos_assinatura_urls")
        .eq("token", token)
        .single();

      if (sessionErr || !sessionData) {
        setError("Sessão não encontrada.");
        return;
      }
      if (!sessionData.is_active) {
        setError("Esta sessão foi encerrada.");
        return;
      }

      const { data: churchData } = await supabase
        .from("churches")
        .select("logo_url")
        .eq("id", sessionData.church_id)
        .single();

      setSession({
        id: sessionData.id,
        titulo: sessionData.titulo,
        tipo: sessionData.tipo,
        church_id: sessionData.church_id,
        church_nome: (sessionData as any).church_nome || "",
        church_logo: churchData?.logo_url,
        fotos_assinatura_urls: (sessionData as any).fotos_assinatura_urls || [],
      });

      let membrosFromSession = ((sessionData as any).membros_json as Membro[]) || [];
      
      // Se não vier membros no JSON (otimização), buscamos direto da tabela de membros
      if (membrosFromSession.length === 0 && sessionData.church_id) {
        const { data: membrosDb } = await supabase
          .from("membros")
          .select("nome, cargo, ativo")
          .eq("church_id", sessionData.church_id);
        
        if (membrosDb) {
          membrosFromSession = (membrosDb as any[]).filter(m => m.ativo !== false);
        }
      } else {
        // Se vier do JSON, também garantimos o filtro (caso o JSON seja antigo)
        membrosFromSession = membrosFromSession.filter((m: any) => m.ativo !== false);
      }

      setMembros([...membrosFromSession].sort((a, b) => a.nome.localeCompare(b.nome)));

      const { data: attendanceData } = await supabase
        .from("assembly_attendance")
        .select("membro_nome")
        .eq("session_id", sessionData.id);

      setPresentes(attendanceData?.map((a) => a.membro_nome) || []);
    } catch {
      setError("Erro ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !session) return;

    setUploading(true);
    const newUrls: string[] = [...(session.fotos_assinatura_urls || [])];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `assinaturas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assinaturas_atas')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assinaturas_atas')
          .getPublicUrl(filePath);
        
        newUrls.push(publicUrl);
      }

      // Atualiza no banco de dados na tabela assembly_sessions
      const { error: updateError } = await supabase
        .from('assembly_sessions')
        .update({ fotos_assinatura_urls: newUrls })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setSession((prev) => prev ? { ...prev, fotos_assinatura_urls: newUrls } : null);
      toast.success(`${files.length} foto(s) da folha de assinatura enviada(s)!`);
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSignature = async (urlToRemove: string) => {
    if (!session) return;
    const confirmRemove = window.confirm("Deseja remover esta foto da folha de assinatura?");
    if (!confirmRemove) return;

    const filtered = (session.fotos_assinatura_urls || []).filter(url => url !== urlToRemove);

    try {
      const { error: updateError } = await supabase
        .from('assembly_sessions')
        .update({ fotos_assinatura_urls: filtered })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setSession((prev) => prev ? { ...prev, fotos_assinatura_urls: filtered } : null);
      toast.success("Foto da folha de assinatura removida!");
    } catch (error: any) {
      toast.error("Erro ao remover foto: " + error.message);
    }
  };

  const handleToggle = async (nome: string) => {
    if (!session || toggling || bulkLoading) return;
    setToggling(nome);
    try {
      const isPresente = presentes.includes(nome);
      if (isPresente) {
        const { error } = await supabase
          .from("assembly_attendance")
          .delete()
          .eq("session_id", session.id)
          .eq("membro_nome", nome);
        if (error) throw error;
        setPresentes((prev) => prev.filter((n) => n !== nome));
      } else {
        const { error } = await supabase.from("assembly_attendance").insert({
          session_id: session.id,
          membro_nome: nome,
        });
        if (error) throw error;
        setPresentes((prev) => [...prev, nome]);
      }
    } catch (err: any) {
      toast.error("Erro ao atualizar presença");
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  const handleMarcarTodos = async () => {
    if (!session || bulkLoading) return;
    setBulkLoading(true);
    try {
      const ausentes = membros.filter((m) => !presentes.includes(m.nome));
      if (ausentes.length === 0) return;
      const inserts = ausentes.map((m) => ({ session_id: session.id, membro_nome: m.nome }));
      const { error } = await supabase.from("assembly_attendance").upsert(inserts, { onConflict: "session_id,membro_nome" });
      if (error) throw error;
      setPresentes(membros.map((m) => m.nome));
    } catch (err: any) {
      toast.error("Erro ao atualizar presença");
      console.error(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDesmarcarTodos = async () => {
    if (!session || bulkLoading) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from("assembly_attendance")
        .delete()
        .eq("session_id", session.id);
      if (error) throw error;
      setPresentes([]);
    } catch (err: any) {
      toast.error("Erro ao limpar presenças");
      console.error(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const quorumRequired = Math.ceil((membros.length * 2) / 3);
  const quorumMet = presentes.length >= quorumRequired;

  const filtered = membros.filter((m) => {
    const matchesSearch = m.nome.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    const isPresente = presentes.includes(m.nome);
    if (filterStatus === "presentes") return isPresente;
    if (filterStatus === "ausentes") return !isPresente;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">Sessão Inválida</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 pt-8 pb-5 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          {/* Church logo */}
          <img
            src={session?.church_logo || "/logo_aviva.png"}
            alt="Logo Igreja"
            className="w-14 h-14 rounded-2xl object-contain bg-white/10 p-1 backdrop-blur-sm shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo_aviva.png"; }}
          />
          {/* Church name */}
          {session?.church_nome && (
            <p className="text-xs uppercase tracking-wider font-semibold opacity-90">{session.church_nome}</p>
          )}
          <h1 className="text-xl font-bold text-center leading-tight">{session?.titulo || 'Marcar Presenças'}</h1>
          <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-1 text-sm font-semibold mt-2 border border-white/30 shadow-sm">
            <Users className="w-4 h-4 inline mr-1" />
            {presentes.length} / {membros.length} presentes
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* Instruction */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-700 text-center">
          Toque para <strong>marcar ✅</strong> ou <strong>desmarcar ❌</strong> cada membro
        </div>

        {/* Folha de Assinatura física upload */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <ImageIcon className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-indigo-950">Folha de Assinaturas</h3>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Se a assinatura for física em papel, envie foto(s) da folha de presença. Elas aparecem no painel do secretário em tempo real! 📸
          </p>

          {/* Galeria de Fotos */}
          {session?.fotos_assinatura_urls && session.fotos_assinatura_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 w-full pt-1">
              {session.fotos_assinatura_urls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-50 group shadow-sm animate-in zoom-in duration-200">
                  <img 
                    src={url} 
                    alt={`Folha ${index + 1}`} 
                    className="w-full h-full object-cover cursor-pointer active:scale-95 transition-transform" 
                    onClick={() => setSelectedPhoto(url)}
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSignature(url)} 
                    className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão de Upload */}
          <div className="relative pt-1">
            <input 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleSignatureUpload} 
              disabled={uploading} 
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" 
            />
            <div className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm font-semibold transition-all ${
              uploading 
                ? "bg-slate-50 border-slate-200 text-slate-400" 
                : "bg-indigo-50/70 hover:bg-indigo-50 border-indigo-200 text-indigo-600 active:scale-[0.98]"
            }`}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Enviando foto...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Tirar Foto / Enviar Folha</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-12 text-base rounded-xl border-gray-200"
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus("todos")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${filterStatus === "todos" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus("presentes")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${filterStatus === "presentes" ? "bg-white shadow-sm text-green-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            Presentes
          </button>
          <button
            onClick={() => setFilterStatus("ausentes")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${filterStatus === "ausentes" ? "bg-white shadow-sm text-red-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            Ausentes
          </button>
        </div>

        {/* Quorum Indicator */}
        {membros.length > 0 && (
          <div className={`rounded-xl p-3 flex flex-col items-center border ${quorumMet ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className={`font-bold text-sm flex items-center gap-1 ${quorumMet ? 'text-emerald-700' : 'text-amber-700'}`}>
              {quorumMet ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {quorumMet ? 'Quórum Atingido' : 'Quórum não atingido'}
            </span>
            <span className={`text-xs mt-0.5 ${quorumMet ? 'text-emerald-600' : 'text-amber-700'}`}>
              {quorumMet 
                ? `Mínimo de 2/3 alcançado (${presentes.length} presentes)` 
                : `Aguardando 2ª chamada (Faltam ${quorumRequired - presentes.length} para ${quorumRequired})`}
            </span>
          </div>
        )}

        {/* Counters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{presentes.length}</p>
            <p className="text-xs text-green-600">Presentes</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-500">{membros.length - presentes.length}</p>
            <p className="text-xs text-slate-400">Ausentes</p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleMarcarTodos}
            disabled={bulkLoading || presentes.length === membros.length}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium disabled:opacity-40 active:scale-[0.97] transition-all"
          >
            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Marcar todos
          </button>
          <button
            type="button"
            onClick={handleDesmarcarTodos}
            disabled={bulkLoading || presentes.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-40 active:scale-[0.97] transition-all"
          >
            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Desmarcar todos
          </button>
        </div>

        {/* Member list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhum membro encontrado</p>
            </div>
          )}
          {filtered.map((m) => {
            const isPresente = presentes.includes(m.nome);
            const isToggling = toggling === m.nome;
            return (
              <button
                key={m.nome}
                type="button"
                onClick={() => handleToggle(m.nome)}
                disabled={!!toggling || bulkLoading}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${
                  isPresente
                    ? "bg-green-50 border-green-300 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {isToggling ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
                ) : isPresente ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm truncate ${isPresente ? "text-green-800" : "text-gray-700"}`}>
                    {m.nome}
                  </p>
                  <p className="text-xs text-gray-400">{m.cargo}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                  isPresente ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {isPresente ? "Presente" : "Ausente"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          As presenças atualizam na ata em tempo real ✝️
        </p>
      </div>

      {/* Lightbox / Fullscreen Image Preview */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-center items-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            type="button" 
            onClick={() => setSelectedPhoto(null)} 
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={selectedPhoto} 
            alt="Folha de Assinatura Ampliada" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
          
          <p className="text-white/60 text-xs mt-4 text-center">
            Toque fora da imagem para fechar
          </p>
        </div>
      )}
    </div>
  );
}
