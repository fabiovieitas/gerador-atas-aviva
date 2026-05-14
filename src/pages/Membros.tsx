import { useAtaStore } from "@/hooks/useAtaStore";
import { MemberManagement } from "@/components/MemberManagement";
import { MemberUpload } from "@/components/MemberUpload";
import { Users, Download, FileSpreadsheet, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Membro } from "@/types/ata";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function MembrosPage({ store }: Props) {
  const { isAdmin, isMaster } = useAuth();
  const [churches, setChurches] = useState<{id: string, nome: string}[]>([]);
  const [filtroNomeRelatorio, setFiltroNomeRelatorio] = useState("");
  const [filtroAnoRelatorio, setFiltroAnoRelatorio] = useState("");
  const [filtroMesRelatorio, setFiltroMesRelatorio] = useState("");

  useEffect(() => {
    if (isAdmin) {
      supabase.from('churches').select('id, nome').order('nome').then(({ data }) => {
        if (data) setChurches(data);
      });
    }
  }, [isAdmin]);

  const handleBulkImport = (novos: Membro[]) => {
    novos.forEach(m => store.addMembro(m));
  };

  const handleBaixarModelo = () => {
    const modeloCsv = [
      "Nome,Cargo,Gênero",
      "João da Silva,Pastor,masculino",
      "Maria Souza,Secretária,feminino",
      "Carlos Pereira,Tesoureiro,masculino",
    ].join("\n");

    const blob = new Blob([modeloCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_membros_aviva.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo de importação baixado!");
  };

  const meses = [
    "", "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12",
  ];

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(store.historico.map((ata) => new Date(ata.geradoEm).getFullYear().toString()));
    return Array.from(anos).sort((a, b) => Number(b) - Number(a));
  }, [store.historico]);

  const atasFiltradas = useMemo(() => {
    return store.historico.filter((ata) => {
      const data = new Date(ata.geradoEm);
      const ano = data.getFullYear().toString();
      const mes = String(data.getMonth() + 1).padStart(2, "0");

      const bateAno = !filtroAnoRelatorio || ano === filtroAnoRelatorio;
      const bateMes = !filtroMesRelatorio || mes === filtroMesRelatorio;
      const bateNome = !filtroNomeRelatorio ||
        ata.membrosPresentes.some((nome) => nome.toLowerCase().includes(filtroNomeRelatorio.toLowerCase())) ||
        store.membros.some((m) => m.nome.toLowerCase().includes(filtroNomeRelatorio.toLowerCase()));

      return bateAno && bateMes && bateNome;
    });
  }, [store.historico, store.membros, filtroAnoRelatorio, filtroMesRelatorio, filtroNomeRelatorio]);

  const gerarRelatorioCsv = () => {
    const gerarNomeArquivo = () => {
      const partes = ["relatorio_presenca"];
      if (filtroAnoRelatorio) partes.push(filtroAnoRelatorio);
      if (filtroMesRelatorio) partes.push(filtroMesRelatorio);
      if (filtroNomeRelatorio.trim()) {
        const nomeLimpo = filtroNomeRelatorio
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (nomeLimpo) partes.push(nomeLimpo);
      }
      return `${partes.join("_")}.csv`;
    };

    const gerarLinhas = (separador: "," | ";") => {
      const linhas: string[] = [`Data${separador}Tipo${separador}Título${separador}Nome${separador}Status`];
      
      atasFiltradas.forEach((ata) => {
        const dataAta = new Date(ata.data);
        const dataStr = new Date(ata.geradoEm).toLocaleDateString("pt-BR");
        
        // Membros filtrados pela data da ata (não existiam se criados depois)
        const membrosNaEpoca = store.membros.filter(m => {
          if (!m.created_at) return true;
          const dataMembro = new Date(m.created_at);
          return dataMembro <= dataAta;
        });

        const membrosFiltrados = membrosNaEpoca.filter((m) =>
          !filtroNomeRelatorio || m.nome.toLowerCase().includes(filtroNomeRelatorio.toLowerCase())
        );

        membrosFiltrados.forEach((m) => {
          const status = ata.membrosPresentes.includes(m.nome) ? "Presente" : "Ausente";
          linhas.push(
            `"${dataStr}"${separador}"${ata.tipo}"${separador}"${ata.titulo.replace(/"/g, '""')}"${separador}"${m.nome.replace(/"/g, '""')}"${separador}"${status}"`
          );
        });
      });

      return linhas;
    };

    const baixarRelatorio = (modo: "csv" | "excel") => {
      const separador = modo === "excel" ? ";" : ",";
      const linhas = gerarLinhas(separador);
      if (linhas.length === 1) {
        toast.info("Nenhum dado para gerar relatório com esses filtros.");
        return;
      }

      const conteudo = modo === "excel" ? "\ufeff" + linhas.join("\n") : linhas.join("\n");
      const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = gerarNomeArquivo();
      link.click();
      URL.revokeObjectURL(url);
      toast.success(modo === "excel" ? "Relatório para Excel gerado com sucesso!" : "Relatório CSV gerado com sucesso!");
    };

    baixarRelatorio("csv");
  };

  const gerarRelatorioExcel = async () => {
    try {
    if (atasFiltradas.length === 0) {
      toast.info("Nenhum dado para gerar relatório com esses filtros.");
      return;
    }

    const partes = ["relatorio_presenca"];
    if (filtroAnoRelatorio) partes.push(filtroAnoRelatorio);
    if (filtroMesRelatorio) partes.push(filtroMesRelatorio);
    if (filtroNomeRelatorio.trim()) {
      const nomeLimpo = filtroNomeRelatorio
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (nomeLimpo) partes.push(nomeLimpo);
    }
    const filtrosAtivos = [
      filtroNomeRelatorio ? `Nome: ${filtroNomeRelatorio}` : null,
      filtroAnoRelatorio ? `Ano: ${filtroAnoRelatorio}` : null,
      filtroMesRelatorio ? `Mês: ${filtroMesRelatorio}` : null,
    ].filter(Boolean).join(" | ");

    const secoesAta = atasFiltradas.map((ata) => {
      const dataAta = new Date(ata.data);
      const dataStr = new Date(ata.geradoEm).toLocaleDateString("pt-BR");
      
      const membrosNaEpoca = store.membros.filter(m => {
        if (!m.created_at) return true;
        const dataMembro = new Date(m.created_at);
        return dataMembro <= dataAta;
      });

      const membrosFiltrados = membrosNaEpoca.filter((m) =>
        !filtroNomeRelatorio || m.nome.toLowerCase().includes(filtroNomeRelatorio.toLowerCase())
      );

      const linhasTabela = membrosFiltrados.map((m) => {
        const status = ata.membrosPresentes.includes(m.nome) ? "Presente" : "Ausente";
        const classeStatus = status === "Presente" ? "status-presente" : "status-ausente";
        const nomeSeguro = m.nome.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
          <tr>
            <td>${nomeSeguro}</td>
            <td class="${classeStatus}">${status}</td>
          </tr>
        `;
      }).join("");

      const tituloSeguro = ata.titulo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `
        <div class="ata-bloco">
          <p class="ata-cabecalho"><strong>Data:</strong> ${dataStr} | <strong>Tipo:</strong> ${ata.tipo} | <strong>Ata:</strong> ${tituloSeguro}</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>
        </div>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 20px; }
    .topo { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    h1 { font-size: 18px; margin: 0; }
    .subtitulo { margin: 2px 0 0; color: #6b7280; font-size: 12px; }
    .filtros { margin: 12px 0; font-size: 12px; color: #374151; }
    .resumo { margin: 6px 0 12px; font-size: 12px; color: #374151; }
    .ata-bloco { margin: 0 0 14px; }
    .ata-cabecalho { margin: 0 0 6px; font-size: 12px; color: #111827; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: bold; }
    tr:nth-child(even) { background: #fafafa; }
    .status-presente { color: #166534; font-weight: bold; }
    .status-ausente { color: #991b1b; font-weight: bold; }
  </style>
</head>
<body>
  <div class="topo">
    <div>
      <h1>Relatório de Participação em Atas</h1>
      <p class="subtitulo">Igreja AVIVA</p>
    </div>
  </div>

  <p class="filtros"><strong>Filtros:</strong> ${filtrosAtivos || "Nenhum (mostrando tudo)"}</p>
  <p class="resumo"><strong>Total de atas:</strong> ${atasFiltradas.length}</p>

  ${secoesAta}
</body>
</html>`;

    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${partes.join("_")}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório para Excel gerado com sucesso!");
    } catch {
      toast.error("Não foi possível gerar o relatório de Excel.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Membros</h1>
          <p className="text-sm text-muted-foreground mt-1">{store.membros.length} membro(s) cadastrado(s)</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2 bg-card border p-2 rounded-lg shadow-sm">
            <Church className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold whitespace-nowrap">Igreja:</span>
            <Select value={store.selectedChurchId || ''} onValueChange={store.setSelectedChurchId}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Selecione a igreja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as igrejas</SelectItem>
                {churches.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(isAdmin || isMaster) && store.selectedChurchId === 'all' && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <Church className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>Você está no modo Global.</strong><br/> 
            Para gerenciar a lista de membros ou gerar relatórios de presença, por favor, <strong>selecione uma igreja específica</strong> no menu acima. A separação por igreja é obrigatória nesta página para evitar confusão.
          </p>
        </div>
      )}

      {/* Item 10: Alerta de Membros Ausentes (Cuidado Pastoral) */}
      {store.selectedChurchId !== 'all' && (
        <>
          {store.membros.length > 0 && (store.historico?.length || 0) >= 2 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-3">
          <div className="flex items-center gap-2 text-red-800">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">Cuidado Pastoral: Membros Ausentes</h3>
          </div>
          <p className="text-xs text-red-700 leading-relaxed">
            Os membros abaixo não constam como presentes nas últimas <strong>{Math.min(store.historico?.length || 0, 3)}</strong> reuniões. 
            Considere uma visita ou contato para cuidado.
          </p>
          <div className="flex flex-wrap gap-2">
            {store.membros.filter(m => m.ativo).filter(m => {
              const ultimasAtas = [...(store.historico || [])].slice(0, 3);
              const atasValidas = ultimasAtas.filter(ata => !m.created_at || new Date(ata.data) >= new Date(m.created_at));
              if (atasValidas.length === 0) return true;
              return atasValidas.every(ata => ata.membrosPresentes?.includes(m.nome));
            }).length === store.membros.filter(m => m.ativo).length ? (
               <p className="text-xs text-green-600 font-medium">✨ Todos os membros participaram recentemente!</p>
            ) : (
              store.membros.filter(m => m.ativo).filter(m => {
                const ultimasAtas = [...(store.historico || [])].slice(0, 3);
                const atasValidas = ultimasAtas.filter(ata => !m.created_at || new Date(ata.data) >= new Date(m.created_at));
                
                // Se o membro é novo e não teve nenhuma reunião válida ainda, não é considerado ausente
                if (atasValidas.length === 0) return false;
                
                // É considerado ausente apenas se faltou em TODAS as reuniões válidas para ele
                return atasValidas.every(ata => !ata.membrosPresentes?.includes(m.nome));
              }).map(m => (
                <span key={m.nome} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-red-200 text-red-700 text-[10px] font-bold shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {m.nome}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      <div className="section-card space-y-4">
        <h2 className="section-title">Gerenciar Membros</h2>
        <div className="flex flex-wrap gap-3">
          <MemberManagement
            membros={store.membros}
            membrosPresentes={store.membrosPresentes}
            onAdd={store.addMembro}
            onRemove={store.removeMembro}
            onUpdate={store.updateMembro}
            onTogglePresenca={store.togglePresenca}
            onSetPresentes={store.setMembrosPresentes}
            showPresenceManager={false}
          />
        </div>
      </div>

      <div className="section-card space-y-4">
        <h2 className="section-title">Importar Lista de Membros</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleBaixarModelo} className="gap-2">
            <Download className="w-4 h-4" /> Baixar modelo CSV
          </Button>
          <p className="text-xs text-muted-foreground">
            Use esse arquivo como exemplo para importar sem erro.
          </p>
        </div>
        <MemberUpload onImport={handleBulkImport} existingMembros={store.membros} />
      </div>

      {store.membros.length > 0 && (
        <div className="section-card">
          <h2 className="section-title flex items-center gap-2">
            <Users className="w-5 h-5" /> Lista Completa
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {store.membros.map((m, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${m.ativo ? 'bg-card hover:bg-muted/30' : 'bg-muted/50 opacity-70'}`}>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm flex items-center gap-2">
                    {m.nome}
                    {!m.ativo && <span className="text-[10px] bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground font-normal">Inativo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.cargo} • {m.genero === 'feminino' ? 'Feminino' : 'Masculino'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-card space-y-4">
        <h2 className="section-title">Participação em Atas e Assembleias</h2>
        <p className="text-sm text-muted-foreground">
          Aqui você acompanha quem esteve presente ou ausente em cada ata.
        </p>

        <div className="grid sm:grid-cols-3 gap-2">
          <Input
            value={filtroNomeRelatorio}
            onChange={(e) => setFiltroNomeRelatorio(e.target.value)}
            placeholder="Filtrar por nome"
          />
          <select
            value={filtroAnoRelatorio}
            onChange={(e) => setFiltroAnoRelatorio(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os anos</option>
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
          <select
            value={filtroMesRelatorio}
            onChange={(e) => setFiltroMesRelatorio(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos os meses</option>
            {meses.slice(1).map((mes) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">{atasFiltradas.length} ata(s) encontrada(s)</p>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="secondary" onClick={gerarRelatorioCsv}>
              Gerar relatório (CSV)
            </Button>
            <Button type="button" variant="outline" onClick={gerarRelatorioExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Baixar para Excel
            </Button>
          </div>
        </div>

        {atasFiltradas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ata encontrada com os filtros atuais.</p>
        ) : (
          <div className="space-y-3">
            {atasFiltradas.map((ata) => {
              const dataAta = new Date(ata.data);
              
              const todosNomesNaEpoca = store.membros
                .filter(m => {
                  if (!m.created_at) return true;
                  const dataMembro = new Date(m.created_at);
                  return dataMembro <= dataAta;
                })
                .map((m) => m.nome)
                .filter((nome) => !filtroNomeRelatorio || nome.toLowerCase().includes(filtroNomeRelatorio.toLowerCase()));

              const presentes = todosNomesNaEpoca.filter((nome) => ata.membrosPresentes.includes(nome));
              const ausentes = todosNomesNaEpoca.filter((nome) => !ata.membrosPresentes.includes(nome));

              return (
                <div key={ata.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-foreground">{ata.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(ata.geradoEm).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })} • {ata.tipo}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="text-xs bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5 font-semibold">{presentes.length} presentes</span>
                      <span className="text-xs bg-red-100 text-red-800 border border-red-200 rounded-full px-2 py-0.5 font-semibold">{ausentes.length} ausentes</span>
                    </div>
                  </div>
                  {presentes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1.5">✅ Presentes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {presentes.map((nome) => (
                          <span key={nome} className="text-xs bg-green-50 text-green-800 border border-green-200 rounded-md px-2 py-0.5">{nome}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ausentes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1.5">❌ Ausentes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ausentes.map((nome) => (
                          <span key={nome} className="text-xs bg-red-50 text-red-800 border border-red-200 rounded-md px-2 py-0.5">{nome}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {store.membros.length === 0 && (
        <div className="section-card text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum membro cadastrado.</p>
          <p className="text-sm text-muted-foreground mt-1">Use os botões acima para adicionar ou importar membros.</p>
        </div>
      )}

      {(isAdmin || isMaster) && (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 flex gap-4">
            <div className="p-2 bg-teal-100 rounded-full text-teal-600 shrink-0 h-fit">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-teal-800">Organização por Cargos</h4>
              <p className="text-xs text-teal-700 leading-relaxed mt-1">
                Manter o cargo e o gênero atualizados ajuda o sistema a gerar o texto da ata corretamente (ex: "o Pastor", "a Secretária"), evitando ajustes manuais no editor.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0 h-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-800">Relatórios de Presença</h4>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                Os relatórios em Excel são ótimos para reuniões de conselho. Você consegue ver o histórico de fidelidade e participação de cada membro nas assembleias.
              </p>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}


