import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil, Users, UserPlus, ClipboardCheck, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import type { Membro } from "@/types/ata";

interface Props {
  membros: Membro[];
  membrosPresentes: string[];
  onAdd: (m: Membro) => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, m: Membro) => void;
  onTogglePresenca: (nome: string) => void;
  onSetPresentes: (nomes: string[]) => void;
  showPresenceManager?: boolean;
}

export function MemberManagement({
  membros,
  membrosPresentes,
  onAdd,
  onRemove,
  onUpdate,
  onTogglePresenca,
  onSetPresentes,
  showPresenceManager = true,
}: Props) {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [genero, setGenero] = useState<'masculino' | 'feminino'>('masculino');
  const [ativo, setAtivo] = useState(true);
  const [editIndex, setEditIndex] = useState(-1);
  const [showMembers, setShowMembers] = useState(false);
  const [showPresenca, setShowPresenca] = useState(false);
  const [filtroPresenca, setFiltroPresenca] = useState("");
  const [modoLista, setModoLista] = useState<"todos" | "presentes" | "ausentes">("todos");

  const salvar = () => {
    if (!nome.trim()) return;
    if (editIndex >= 0) {
      onUpdate(editIndex, { nome, cargo, genero, ativo });
      setEditIndex(-1);
    } else {
      onAdd({ nome, cargo, genero, ativo });
    }
    setNome(''); setCargo(''); setGenero('masculino'); setAtivo(true);
  };

  const editar = (i: number) => {
    const m = membros[i];
    setNome(m.nome); setCargo(m.cargo); setGenero(m.genero); 
    setAtivo(m.ativo === false ? false : true);
    setEditIndex(i);
  };

  const removerMembro = (i: number) => {
    const nomeMembro = membros[i]?.nome;
    const confirmar = window.confirm(`Deseja realmente apagar o membro "${nomeMembro}"?`);
    if (!confirmar) return;
    onRemove(i);
    toast.success("Membro apagado com sucesso.");
  };

  const membrosFiltrados = membros
    .filter((m) => {
      // No gerenciador (showMembers), mostra todos. Na lista de presença, apenas ativos.
      if (showPresenca) return m.ativo;
      return true;
    })
    .filter((m) => m.nome.toLowerCase().includes(filtroPresenca.toLowerCase()))
    .filter((m) => {
      if (modoLista === "presentes") return membrosPresentes.includes(m.nome);
      if (modoLista === "ausentes") return !membrosPresentes.includes(m.nome);
      return true;
    });

  return (
    <div className="flex gap-2 flex-wrap">
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <Users className="w-4 h-4 mr-2" /> Gerenciar Membros ({membros.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Gerenciar Membros
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="form-label">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label className="form-label">Cargo(s)</Label>
              <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: 1º Secretário, Presbítero" />
            </div>
            <div className="space-y-2">
              <Label className="form-label">Status do Membro</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={ativo ? "default" : "outline"}
                  className={`flex-1 gap-2 ${ativo ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => setAtivo(true)}
                >
                  {ativo && <CheckCircle2 className="w-4 h-4" />} Ativo
                </Button>
                <Button
                  type="button"
                  variant={!ativo ? "destructive" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setAtivo(false)}
                >
                  {!ativo && <X className="w-4 h-4" />} Inativo
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Membros inativos não aparecem na lista de presença das assembleias.
              </p>
            </div>
            <div>
              <Label className="form-label">Gênero</Label>
              <RadioGroup value={genero} onValueChange={v => setGenero(v as any)} className="flex gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="masculino" id="masc" />
                  <Label htmlFor="masc" className="font-normal">Masculino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="feminino" id="fem" />
                  <Label htmlFor="fem" className="font-normal">Feminino</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={salvar}>
                {editIndex >= 0 ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editIndex >= 0 && (
                <Button type="button" variant="secondary" onClick={() => { setEditIndex(-1); setNome(''); setCargo(''); setGenero('masculino'); }}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Lista de Membros</p>
            {membros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {membros.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {m.nome}
                      {!m.ativo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-normal">Inativo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.cargo} • {m.genero === 'feminino' ? 'F' : 'M'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editar(i)} className="h-7 px-2">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removerMembro(i)} className="h-7 px-2 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPresenceManager && (
        <Dialog open={showPresenca} onOpenChange={setShowPresenca}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <ClipboardCheck className="w-4 h-4 mr-2" /> Presença ({membrosPresentes.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Membros Presentes</DialogTitle>
            </DialogHeader>
            {membros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre membros primeiro.</p>
            ) : (
              <div className="space-y-2">
                <Input
                  value={filtroPresenca}
                  onChange={(e) => setFiltroPresenca(e.target.value)}
                  placeholder="Buscar membro..."
                />
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant={modoLista === "todos" ? "default" : "secondary"} size="sm" onClick={() => setModoLista("todos")}>
                    Todos
                  </Button>
                  <Button type="button" variant={modoLista === "presentes" ? "default" : "secondary"} size="sm" onClick={() => setModoLista("presentes")}>
                    Presentes
                  </Button>
                  <Button type="button" variant={modoLista === "ausentes" ? "default" : "secondary"} size="sm" onClick={() => setModoLista("ausentes")}>
                    Ausentes
                  </Button>
                </div>
              </div>
            )}
            {membros.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {membrosFiltrados.map(m => (
                  <div key={m.nome} className="flex items-center gap-3 p-2 rounded border">
                    <Checkbox
                      checked={membrosPresentes.includes(m.nome)}
                      onCheckedChange={() => onTogglePresenca(m.nome)}
                    />
                    <span className="text-sm">{m.nome}</span>
                  </div>
                ))}
                {membrosFiltrados.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">Nenhum membro encontrado com esse filtro.</p>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => onSetPresentes(membros.map(m => m.nome))}>
                Marcar Todos
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => onSetPresentes([])}>
                Desmarcar Todos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
