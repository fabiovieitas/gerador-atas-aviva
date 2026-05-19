import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Membro, AtaFormData, AtaHistorico, DadosFinanceiros, Deliberacao } from '@/types/ata';
import { valorPorExtenso, numeroPorExtenso } from '@/lib/extenso';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emptyMes = (): DadosFinanceiros => ({
  nome: '', ano: new Date().getFullYear().toString(),
  caixaInicial: '', entradas: '', saidas: '', caixaFinal: '',
});

const cleanUrls = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
    const inner = val.slice(1, -1).trim();
    return inner ? inner.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [];
  }
  return [];
};

const initialFormData: AtaFormData = {
  dataReuniao: '', tipoAssembleia: 'Ordinária',
  horaInicio: '', horaTermino: '',
  semQuorum: false, horaSegundaChamada: '',
  pastorDirigente: '', localReuniao: '', assuntosPrincipais: '',
  palavraInicial: '', hinoHarpa: '',
  aprovacaoAtaAnterior: 'unanimidade',
  ressalvaMembro: '', ressalvaMotivos: '', ressalvaEsclarecimentos: '',
  ressalvaPosicaoFinal: 'manteve',
  tesoureira: '', relatorioMultiplosMeses: false, descricaoPeriodo: '',
  mes1: emptyMes(), mes2: emptyMes(), incluirMes2: false,
  aprovadorConselhoFiscal: '', aprovacaoFinanceira: true,
  deliberacoes: [], nomeSecretario: '',
  fotosAssinaturaUrls: [],
};

export function useAtaStore() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [historico, setHistorico] = useState<AtaHistorico[]>([]);
  const [formData, setFormData] = useState<AtaFormData>(initialFormData);
  const [membrosPresentes, setMembrosPresentes] = useState<string[]>([]);
  const { profile, user, loading: authLoading, isAdmin, isMaster } = useAuth();
  const [ataGerada, setAtaGerada] = useState('');
  const [defaults, setDefaults] = useLocalStorage<Record<string, string>>('ataDefaults', {});
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [churches, setChurches] = useState<{id: string, nome: string}[]>([]);
  const [churchInfo, setChurchInfo] = useState<{
    nome: string, 
    cidade: string, 
    estado: string, 
    logo_url?: string,
    estatuto_texto?: string,
    regimento_texto?: string,
    gemini_api_key?: string
  } | null>(null);
  const [churchError, setChurchError] = useState<string | null>(null);
  const [currentAtaId, setCurrentAtaId] = useState<string | number | null>(null);
  const [originalAtaData, setOriginalAtaData] = useState<AtaHistorico | null>(null);
  const [presenceSessionId, setPresenceSessionId] = useState<string | null>(null);

  const logAudit = useCallback(async (action: string, details: string, tableName?: string, recordId?: string, oldData?: any, newData?: any) => {
    if (!user || !profile?.church_id) return;
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        church_id: profile.church_id,
        action,
        details,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: newData
      });
    } catch (err) {
      console.error('Erro ao gravar log de auditoria:', err);
    }
  }, [user, profile]);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.church_id && !selectedChurchId) {
      setSelectedChurchId(profile.church_id);
    }
  }, [profile?.church_id, selectedChurchId, authLoading]);

  useEffect(() => {
    const fetchNuvem = async () => {
      try {
        if (authLoading || !user) return;

        const isAdminOrMaster = isAdmin || isMaster;

        // 1. Fetch churches if admin
        if (isAdminOrMaster) {
          const { data: cData } = await supabase.from('churches').select('id, nome').order('nome');
          if (cData) setChurches(cData);
        }

        // 2. Identify the target church ID
        let idToFetch = isAdminOrMaster ? (selectedChurchId || 'all') : profile?.church_id;

        // 3. Fetch Church Info
        if (idToFetch && idToFetch !== 'all') {
          const { data: churchData, error: churchErr } = await supabase
            .from('churches')
            .select('nome, cidade, estado, logo_url, estatuto_texto, regimento_texto, gemini_api_key')
            .eq('id', idToFetch)
            .maybeSingle();

          if (churchData) {
            // Global Fallback for missing legal texts
            if (!churchData.estatuto_texto || !churchData.regimento_texto) {
              const { data: globalLegal } = await supabase
                .from('churches')
                .select('estatuto_texto, regimento_texto')
                .not('estatuto_texto', 'is', null)
                .limit(1)
                .maybeSingle();
              
              if (globalLegal) {
                churchData.estatuto_texto = churchData.estatuto_texto || globalLegal.estatuto_texto;
                churchData.regimento_texto = churchData.regimento_texto || globalLegal.regimento_texto;
              }
            }
            setChurchInfo(churchData as any);
            setChurchError(null);
          } else {
            console.warn("Church not found or no access:", idToFetch);
            setChurchInfo(null);
          }
        } else {
          // Global Mode Fallback
          const { data: globalLegal } = await supabase
            .from('churches')
            .select('nome, estatuto_texto, regimento_texto, gemini_api_key')
            .not('estatuto_texto', 'is', null)
            .limit(1)
            .maybeSingle();

          setChurchInfo({
            nome: isAdminOrMaster ? "Todas as Unidades" : (globalLegal?.nome || "Igreja AVIVA"),
            cidade: "",
            estado: "",
            estatuto_texto: globalLegal?.estatuto_texto || "",
            regimento_texto: globalLegal?.regimento_texto || "",
            gemini_api_key: globalLegal?.gemini_api_key || ""
          });
        }

        // 4. Fetch Members & History if we have an ID
        const finalId = (idToFetch && idToFetch !== 'all') ? idToFetch : null;
        
        const mQuery = supabase.from('membros').select('*').order('nome');
        const { data: mData } = await (finalId ? mQuery.eq('church_id', finalId) : mQuery);
        if (mData) {
          setMembros(mData.map(m => ({ 
            id: m.id,
            nome: m.nome, 
            cargo: m.cargo || '', 
            genero: m.genero as 'masculino' | 'feminino',
            ativo: m.ativo === false ? false : true,
            created_at: m.created_at
          })));
        }

        const hQuery = supabase
          .from('atas')
          .select('*, creator:profiles!atas_created_by_fkey(nome), editor:profiles!atas_updated_by_fkey(nome)')
          .order('created_at', { ascending: false });
        const { data: hData } = await (finalId ? hQuery.eq('church_id', finalId) : hQuery);
        if (hData) {
          setHistorico(hData.map(h => ({
            id: h.id,
            titulo: h.titulo,
            data: (h.dados_json as any)?.dataReuniao || '',
            tipo: (h.dados_json as any)?.tipoAssembleia || '',
            dados: h.dados_json as any,
            membrosPresentes: (h.dados_json as any)?.membrosPresentes || [],
            ataTexto: h.conteudo || '',
            geradoEm: h.created_at,
            fotosAssinaturaUrls: (h.dados_json as any)?.fotosAssinaturaUrls || (h.foto_assinatura_url ? [h.foto_assinatura_url] : []),
            criadoPor: (h as any).creator?.nome || 'Sistema',
            editadoPor: (h as any).editor?.nome || null
          })));
        }
      } catch (err) {
        console.error("Critical error in AtaStore:", err);
      }
    };
    fetchNuvem();
  }, [selectedChurchId, profile, user, authLoading, isAdmin, isMaster]);

  // Sincronização em Tempo Real da Presença (Global) - Resposta Instantânea
  useEffect(() => {
    if (!presenceSessionId) return;

    // Buscar fotos de assinaturas iniciais da sessão
    supabase
      .from('assembly_sessions')
      .select('fotos_assinatura_urls')
      .eq('id', presenceSessionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setFormData(prev => ({
            ...prev,
            fotosAssinaturaUrls: cleanUrls(data.fotos_assinatura_urls)
          }));
        }
      });

    // Canal para marcar presença
    const presenceChannel = supabase
      .channel(`global-presenca-${presenceSessionId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "assembly_attendance",
      }, (payload) => {
        // Se for uma entrada, verificamos se é para nós
        if (payload.eventType === 'INSERT' && payload.new.session_id === presenceSessionId) {
          const novoNome = payload.new.membro_nome;
          setMembrosPresentes(prev => prev.includes(novoNome) ? prev : [...prev, novoNome]);
          return;
        }

        // Se for uma saída (DELETE), recarregamos sempre para garantir sincronia total
        if (payload.eventType === 'DELETE') {
          supabase
            .from("assembly_attendance")
            .select("membro_nome")
            .eq("session_id", presenceSessionId)
            .then(({ data }) => {
              if (data) setMembrosPresentes(data.map(d => d.membro_nome));
            });
        }
      })
      .subscribe();

    // Canal para atualizações da sessão (ex: envio de fotos de assinaturas por celular)
    const sessionChannel = supabase
      .channel(`global-sessao-${presenceSessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "assembly_sessions",
        filter: `id=eq.${presenceSessionId}`,
      }, (payload) => {
        const updatedSession = payload.new as any;
        if (updatedSession) {
          setFormData(prev => ({
            ...prev,
            fotosAssinaturaUrls: cleanUrls(updatedSession.fotos_assinatura_urls)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [presenceSessionId]);

  const updateField = useCallback(<K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMes = useCallback((mes: 'mes1' | 'mes2', field: keyof DadosFinanceiros, value: string) => {
    setFormData(prev => {
      const updated = { ...prev[mes], [field]: value };
      if (['caixaInicial', 'entradas', 'saidas'].includes(field)) {
        const parse = (v: string) => {
          if (!v) return 0;
          // Remove R$, espaços e o ponto de milhar para converter corretamente para float
          const cleaned = v.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          const n = parseFloat(cleaned);
          return isNaN(n) ? 0 : n;
        };
        const final = parse(updated.caixaInicial) + parse(updated.entradas) - parse(updated.saidas);
        updated.caixaFinal = `R$ ${final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      return { ...prev, [mes]: updated };
    });
  }, []);

  const addDeliberacao = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      deliberacoes: [...prev.deliberacoes, { id: Date.now().toString(), texto: '' }],
    }));
  }, []);

  const updateDeliberacao = useCallback((id: string, updates: Partial<Deliberacao>) => {
    setFormData(prev => ({
      ...prev,
      deliberacoes: prev.deliberacoes.map(d => d.id === id ? { ...d, ...updates } : d),
    }));
  }, []);

  const removeDeliberacao = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      deliberacoes: prev.deliberacoes.filter(d => d.id !== id),
    }));
  }, []);

  const addMembro = useCallback(async (membro: Membro) => {
    if (!profile?.church_id) return;
    
    try {
      const { data, error } = await supabase.from('membros').insert({
        nome: membro.nome, 
        cargo: membro.cargo, 
        genero: membro.genero, 
        ativo: membro.ativo,
        church_id: profile.church_id
      }).select().single();

      if (error) throw error;
      
      if (data) {
        setMembros(prev => [...prev, { ...membro, id: data.id }]);
        logAudit('CRIOU_MEMBRO', `Adicionou o membro ${membro.nome}`, 'membros', data.id, null, membro);
        toast.success("Membro adicionado com sucesso!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar membro no banco de dados.");
    }
  }, [profile, logAudit]);

  const removeMembro = useCallback(async (index: number) => {
    const membro = membros[index];
    if (!membro) return;

    try {
      if (membro.id) {
        const { error } = await supabase.from('membros').delete().eq('id', membro.id);
        if (error) throw error;
      } else {
        // Fallback para deletar por nome se não tiver ID (membros antigos)
        await supabase.from('membros').delete().eq('church_id', profile?.church_id).eq('nome', membro.nome);
      }
      
      setMembros(prev => prev.filter((_, i) => i !== index));
      logAudit('REMOVEU_MEMBRO', `Removeu o membro ${membro.nome}`, 'membros', membro.id, membro, null);
      toast.success("Membro removido.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover membro.");
    }
  }, [membros, profile, logAudit]);

  const updateMembro = useCallback(async (index: number, membro: Membro) => {
    const membroAntigo = membros[index];
    if (!membroAntigo || !profile?.church_id) return;

    try {
      const payload = { 
        nome: membro.nome, 
        cargo: membro.cargo, 
        genero: membro.genero,
        ativo: membro.ativo 
      };

      if (membroAntigo.id) {
        const { error } = await supabase.from('membros').update(payload).eq('id', membroAntigo.id);
        if (error) throw error;
      } else {
        // Fallback por nome
        const { error } = await supabase.from('membros').update(payload).eq('church_id', profile.church_id).eq('nome', membroAntigo.nome);
        if (error) throw error;
      }

      setMembros(prev => prev.map((m, i) => i === index ? { ...membro, id: membroAntigo.id } : m));
      logAudit('EDITOU_MEMBRO', `Editou o membro ${membroAntigo.nome}`, 'membros', membroAntigo.id, membroAntigo, membro);
      toast.success("Membro atualizado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar membro.");
    }
  }, [membros, profile, logAudit]);

  const togglePresenca = useCallback((nome: string) => {
    setMembrosPresentes(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  }, []);

  const gerarAta = useCallback(() => {
    const d = formData;
    const activeMembros = membros.filter(m => m.ativo);
    const getMembro = (nome: string) => activeMembros.find(mb => mb.nome === nome);
    
    // Função auxiliar para nomes e cargos
    const refMembro = (nome: string, formal: boolean = false) => {
      const m = getMembro(nome);
      if (!m) return nome;
      if (formal) {
        if (m.cargo) return `${m.cargo} ${m.nome}`;
        return m.nome;
      }
      if (m.cargo) return `${m.genero === 'feminino' ? 'a' : 'o'} ${m.cargo} ${nome}`;
      return `${m.genero === 'feminino' ? 'a irmã' : 'o irmão'} ${nome}`;
    };

    // Data por extenso
    const data = d.dataReuniao ? new Date(d.dataReuniao + 'T12:00:00') : new Date();
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const diaNum = data.getDate();
    const diaExtenso = diaNum === 1 ? "primeiro" : numeroParaExtenso(diaNum);
    const mesExtenso = meses[data.getMonth()];
    const anoExtenso = numeroParaExtenso(data.getFullYear());
    
    // Horários por extenso
    const formatHoraExtenso = (horario: string) => {
      if (!horario) return "___ horas e ___ minutos";
      const [h, m] = horario.split(':').map(Number);
      return `${numeroParaExtenso(h)} ${h === 1 ? 'hora' : 'horas'} e ${numeroParaExtenso(m)} ${m === 1 ? 'minuto' : 'minutos'}`;
    };

    const localIgreja = churchInfo 
      ? `${churchInfo.nome}, em ${churchInfo.cidade}, situada na ${d.localReuniao || '___'}`
      : `IGREJA EVANGÉLICA AVIVA, em ${d.localReuniao || '___'}`;

    function numeroParaExtenso(n: number) {
      return numeroPorExtenso(n);
    }

    // 1. TÍTULO
    const cnpj = defaults.cnpj ? ` - CNPJ: ${defaults.cnpj}` : '';
    let texto = `ATA DE ASSEMBLEIA ${d.tipoAssembleia.toUpperCase()} DA IGREJA EVANGÉLICA AVIVA, EM ${churchInfo?.cidade.toUpperCase() || '___'}, ${churchInfo?.estado.toUpperCase() || '___'}${cnpj}, NA FORMA ABAIXO:\n\n`;

    // 2. ABERTURA
    texto += `Ao ${diaExtenso} dia do mês de ${mesExtenso} do ano de ${anoExtenso}, às ${formatHoraExtenso(d.horaInicio)}, no templo da ${localIgreja}, `;
    texto += `reuniram-se, em Assembleia ${d.tipoAssembleia.toLowerCase()}, os membros ativos desta igreja, sob a direção d${refMembro(d.pastorDirigente)}, para deliberar sobre ${d.assuntosPrincipais || 'situações diversas'}.\n\n`;

    // 3. QUÓRUM E EXPEDIENTE
    if (d.semQuorum) {
      texto += `Não havendo quórum suficiente em primeira convocação, a assembleia foi instalada em segunda convocação, às ${formatHoraExtenso(d.horaSegundaChamada || "___")}, com os membros presentes, conforme determina o parágrafo único do Art. 53 do Estatuto. Sendo assim, ${refMembro(d.pastorDirigente)} declara abertos os trabalhos. `;
    } else {
      texto += `Após ter feito a chamada dos membros presentes, e havendo quórum suficiente, ${refMembro(d.pastorDirigente)} declara instalada a assembleia e abertos os trabalhos. `;
    }
    
    if (d.palavraInicial) {
      texto += `Ainda traz uma breve palavra sobre ${d.palavraInicial}. `;
    }
    
    texto += `Em seguida, é feita a leitura da ata do mês anterior, sendo a mesma aprovada de forma ${d.aprovacaoAtaAnterior}. `;
    
    // 4. RELATÓRIO FINANCEIRO
    if (d.aprovacaoFinanceira) {
      const mesFin = d.mes1;
      texto += `Dando continuidade, convoca ${refMembro(d.tesoureira)} para apresentar o relatório financeiro referente ao mês de ${mesFin.nome} de ${mesFin.ano}. `;
      texto += `Sendo assim, a mesma informou que o caixa inicial da igreja, em ${mesFin.nome} do ano de ${mesFin.ano}, foi de ${valorPorExtenso(mesFin.caixaInicial || "R$ 0,00")}, `;
      texto += `a entrada de ${valorPorExtenso(mesFin.entradas || "R$ 0,00")}, saída de ${valorPorExtenso(mesFin.saidas || "R$ 0,00")} e tendo, como caixa final, a quantia de ${valorPorExtenso(mesFin.caixaFinal || "R$ 0,00")}. `;
      
      if (d.aprovadorConselhoFiscal) {
        texto += `Após a apresentação, houve total apoio do conselho fiscal, representado por ${refMembro(d.aprovadorConselhoFiscal)}, e passou para a igreja a aprovação do relatório e seu conteúdo, sendo o mesmo aprovado de forma ${d.aprovacaoFinanceira ? 'unânime' : 'com ressalvas'}.\n\n`;
      } else {
        texto += `Após a apresentação, o relatório foi aprovado de forma unânime pela assembleia.\n\n`;
      }
    }

    // 5. DELIBERAÇÕES ADICIONAIS
    if (d.deliberacoes.length > 0) {
      texto += `Dando prosseguimento aos trabalhos, foram tratados os seguintes assuntos:\n`;
      d.deliberacoes.forEach((item) => {
        texto += `- ${item.texto}\n`;
      });
      texto += `\n`;
    }

    // 6. FECHAMENTO
    texto += `Feito isso, ${refMembro(d.pastorDirigente, true)} encerrou esta Assembleia ${d.tipoAssembleia}, às ${formatHoraExtenso(d.horaTermino).split(' e ')[0]}, orando e impetrando a bênção apostólica. `;
    texto += `E, por não haver mais nada a ser tratado, eu, ${d.nomeSecretario || '___'}, na qualidade de ${getMembro(d.nomeSecretario)?.genero === 'masculino' ? '1º Secretário' : '1ª Secretária'}, lavrei a presente Ata, que após lida e aprovada pela Assembleia, vai assinada, por mim, pelo ${refMembro(d.pastorDirigente, true)} e por todos os membros da igreja presentes nesta Assembleia.\n\n`;
    
    texto += `{{ASSINATURAS}}`;
    
    return texto;
  }, [formData, membros, churchInfo]);

  const salvarNoHistorico = useCallback((texto: string) => {
    const d = formData;
    if (!d.dataReuniao) return;
    const titulo = `${d.dataReuniao} – Ata ${d.tipoAssembleia}`;
    const novaAta: AtaHistorico = {
      id: Date.now(), titulo, data: d.dataReuniao, tipo: d.tipoAssembleia,
      dados: { ...d }, membrosPresentes: [...membrosPresentes],
      ataTexto: texto, geradoEm: new Date().toISOString(),
      fotosAssinaturaUrls: d.fotosAssinaturaUrls || [],
    };
    setHistorico(prev => [novaAta, ...prev]);

    if (profile?.church_id && user) {
      let areasModificadas: string[] = [];
      if (currentAtaId && originalAtaData) {
        if (texto !== originalAtaData.ataTexto) areasModificadas.push("Texto Redigido");
        if (JSON.stringify(membrosPresentes) !== JSON.stringify(originalAtaData.membrosPresentes)) areasModificadas.push("Lista de Presença");
        if (JSON.stringify(d.mes1) !== JSON.stringify(originalAtaData.dados.mes1) || JSON.stringify(d.mes2) !== JSON.stringify(originalAtaData.dados.mes2)) areasModificadas.push("Financeiro");
        if (JSON.stringify(d.deliberacoes) !== JSON.stringify(originalAtaData.dados.deliberacoes)) areasModificadas.push("Deliberações");
        if (d.dataReuniao !== originalAtaData.dados.dataReuniao || d.horaInicio !== originalAtaData.dados.horaInicio || d.pastorDirigente !== originalAtaData.dados.pastorDirigente || d.nomeSecretario !== originalAtaData.dados.nomeSecretario || d.tesoureira !== originalAtaData.dados.tesoureira) areasModificadas.push("Informações/Cargos");
      }

      const ataDataToSave = {
        titulo, 
        conteudo: texto, 
        dados_json: { ...d, membrosPresentes, areasModificadas: areasModificadas.length > 0 ? areasModificadas : (d as any).areasModificadas },
        church_id: (selectedChurchId && selectedChurchId !== 'all') ? selectedChurchId : profile.church_id,
        created_by: user.id
      };

      // Se temos um ID (string do supabase), fazemos update em vez de upsert
      const query = typeof currentAtaId === 'string' 
        ? supabase.from('atas').update({ 
            titulo,
            conteudo: texto,
            dados_json: ataDataToSave.dados_json,
            updated_by: user.id // Registra quem está editando
          }).eq('id', currentAtaId)
        : supabase.from('atas').insert({
            ...ataDataToSave,
            updated_by: user.id // No insert inicial, ele é o criador e editor
          });

      query.select('id').single().then(async ({ data: ataData, error: saveErr }) => {
        if (saveErr) {
          console.error('Erro ao salvar no Supabase:', saveErr);
          toast.error(`Erro técnico: ${saveErr.message || 'Verifique o console'}`);
          return;
        }
        
        if (ataData) {
          setCurrentAtaId(ataData.id);
        }
        
        logAudit(currentAtaId ? 'EDITOU_ATA' : 'SALVOU_ATA', `Salvou a ata: ${titulo}`, 'atas');
        
        // Item 8: Salvar Pendências no banco
        const tasks = d.deliberacoes.filter(del => del.isTask);
        if (tasks.length > 0 && ataData) {
          const taskInserts = tasks.map(t => ({
            church_id: profile.church_id,
            ata_id: ataData.id,
            titulo: t.texto.substring(0, 100),
            descricao: t.texto,
            responsavel: t.taskResponsible,
            data_limite: t.taskDeadline,
            status: 'pendente'
          }));
          await supabase.from('assembly_tasks').insert(taskInserts);
        }
      });
    }
  }, [formData, membrosPresentes, profile, user, logAudit]);

  const carregarDoHistorico = useCallback((ata: AtaHistorico) => {
    setFormData(ata.dados);
    setMembrosPresentes(ata.membrosPresentes);
    setAtaGerada(ata.ataTexto);
    setCurrentAtaId(ata.id);
    setOriginalAtaData(ata);
  }, []);

  const loadAta = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('atas').select('*').eq('id', id).single();
    if (error) {
      toast.error('Erro ao carregar ata do banco.');
      return;
    }
    if (data) {
      const h = data;
      const ata: AtaHistorico = {
        id: h.id,
        titulo: h.titulo,
        data: (h.dados_json as any)?.dataReuniao || '',
        tipo: (h.dados_json as any)?.tipoAssembleia || '',
        dados: h.dados_json as any,
        membrosPresentes: (h.dados_json as any)?.membrosPresentes || [],
        ataTexto: h.conteudo || '',
        geradoEm: h.created_at,
        fotosAssinaturaUrls: (h.dados_json as any)?.fotosAssinaturaUrls || (h.foto_assinatura_url ? [h.foto_assinatura_url] : []),
      };
      carregarDoHistorico(ata);
      setOriginalAtaData(ata);
    }
  }, [carregarDoHistorico]);

  const excluirDoHistorico = useCallback(async (id: number | string) => {
    setHistorico(prev => prev.filter(a => a.id !== id));
    if (typeof id === 'string') {
      await supabase.from('atas').delete().eq('id', id);
      logAudit('REMOVEU_ATA', `Excluiu a ata com ID: ${id}`, 'atas', id);
    }
  }, [logAudit]);

  const limparFormulario = useCallback(() => {
    setFormData(initialFormData);
    setMembrosPresentes([]);
    setAtaGerada('');
    setCurrentAtaId(null);
    setOriginalAtaData(null);
  }, []);

  const saveDefault = useCallback((key: string, value: string) => {
    setDefaults(prev => ({ ...prev, [key]: value }));
  }, [setDefaults]);

  const loadDefaults = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      pastorDirigente: defaults.pastorDirigente || prev.pastorDirigente,
      localReuniao: defaults.localReuniao || prev.localReuniao,
      assuntosPrincipais: defaults.assuntosPrincipais || prev.assuntosPrincipais,
      tesoureira: defaults.tesoureira || prev.tesoureira,
      nomeSecretario: defaults.nomeSecretario || prev.nomeSecretario,
    }));
  }, [defaults]);

  const preencherTeste = useCallback(() => {
    const nomePastor = 'Airton Siqueira';
    const nomeSecretario = 'Adlai Brum Siqueira Marques';
    const nomeTesoureira = 'Thayná Ramos da Silva Barbosa';
    const nomeAprovador = 'Manoel Messias';

    setFormData(prev => ({
      ...prev,
      dataReuniao: '2025-11-08', 
      horaInicio: '19:30', 
      horaTermino: '21:00',
      pastorDirigente: nomePastor, 
      nomeSecretario: nomeSecretario,
      tesoureira: nomeTesoureira,
      localReuniao: 'Templo Sede', 
      assuntosPrincipais: 'Aclamação de Membros e Relatório Financeiro',
      palavraInicial: 'Salmo 133',
      hinoHarpa: '15',
      aprovadorConselhoFiscal: nomeAprovador,
      mes1: {
        nome: 'Outubro',
        ano: '2025',
        caixaInicial: 'R$ 500,00',
        entradas: 'R$ 1.200,00',
        saidas: 'R$ 300,00',
        caixaFinal: 'R$ 1.400,00'
      },
      deliberacoes: [
        { id: '1', texto: 'Aprovada a recepção de 02 novos membros por aclamação.' },
        { id: '2', texto: 'Definida a data da próxima festividade para o dia 20 de Dezembro.' }
      ]
    }));

    // Se houver membros no banco, marca alguns como presentes
    if (membros.length > 0) {
      setMembrosPresentes(membros.slice(0, 3).map(m => m.nome));
    } else {
      // Fallback caso não tenha membros cadastrados ainda
      setMembrosPresentes([nomePastor, nomeSecretario, nomeTesoureira]);
    }
  }, [membros]);

  return {
    formData, updateField, updateMes,
    membros, addMembro, removeMembro, updateMembro,
    membrosPresentes, setMembrosPresentes, togglePresenca,
    deliberacoes: formData.deliberacoes, addDeliberacao, updateDeliberacao, removeDeliberacao,
    ataGerada, setAtaGerada, gerarAta,
    historico, salvarNoHistorico, carregarDoHistorico, excluirDoHistorico,
    limparFormulario, preencherTeste, loadAta,
    defaults, saveDefault, loadDefaults,
    currentAtaId,
    selectedChurchId, setSelectedChurchId,
    churches,
    churchInfo,
    churchError,
    presenceSessionId, setPresenceSessionId
  };
}
