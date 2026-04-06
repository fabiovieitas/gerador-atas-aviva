import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil, Users, UserPlus, ClipboardCheck } from "lucide-react";
import type { Membro } from "@/types/ata";

interface Props {
  membros: Membro[];
  membrosPresentes: string[];
  onAdd: (m: Membro) => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, m: Membro) => void;
  onTogglePresenca: (nome: string) => void;
  onSetPresentes: (nomes: string[]) => void;
}

export function MemberManagement({ membros, membrosPresentes, onAdd, onRemove, onUpdate, onTogglePresenca, onSetPresentes }: Props) {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [genero, setGenero] = useState<'masculino' | 'feminino'>('masculino');
  const [editIndex, setEditIndex] = useState(-1);
  const [showMembers, setShowMembers] = useState(false);
  const [showPresenca, setShowPresenca] = useState(false);

  const salvar = () => {
    if (!nome.trim()) return;
    if (editIndex >= 0) {
      onUpdate(editIndex, { nome, cargo, genero });
      setEditIndex(-1);
    } else {
      onAdd({ nome, cargo, genero });
    }
    setNome(''); setCargo(''); setGenero('masculino');
  };

  const editar = (i: number) => {
    const m = membros[i];
    setNome(m.nome); setCargo(m.cargo); setGenero(m.genero);
    setEditIndex(i);
  };

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
                    <p className="text-sm font-medium">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.cargo} • {m.genero === 'feminino' ? 'F' : 'M'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editar(i)} className="h-7 px-2">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(i)} className="h-7 px-2 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {membros.map(m => (
                <div key={m.nome} className="flex items-center gap-3 p-2 rounded border">
                  <Checkbox
                    checked={membrosPresentes.includes(m.nome)}
                    onCheckedChange={() => onTogglePresenca(m.nome)}
                  />
                  <span className="text-sm">{m.nome}</span>
                </div>
              ))}
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
    </div>
  );
}
