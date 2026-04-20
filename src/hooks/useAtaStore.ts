import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Membro, AtaFormData, AtaHistorico, DadosFinanceiros, Deliberacao } from '@/types/ata';
import { valorPorExtenso } from '@/lib/extenso';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emptyMes = (): DadosFinanceiros => ({
  nome: '', ano: new Date().getFullYear().toString(),
  caixaInicial: '', entradas: '', saidas: '', caixaFinal: '',
});

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
  const [churchConfig, setChurchConfig] = useState<any>(null);
  const { profile, user } = useAuth();
  const [ataGerada, setAtaGerada] = useState('');
  const [defaults, setDefaults] = useLocalStorage<Record<string, string>>('ataDefaults', {});
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);

  // Carregar configurações da igreja
  useEffect(() => {
    if (profile?.church_id) {
      supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single()
        .then(({ data }) => {
          if (data) setChurchConfig(data.settings);
        });
    }
  }, [profile?.church_id]);

  // Define a igreja inicial baseada no perfil
  useEffect(() => {
    if (profile?.church_id && !selectedChurchId) {
      setSelectedChurchId(profile.church_id);
    }
  }, [profile?.church_id, selectedChurchId]);

  // Carregar dados da nuvem quando a igreja selecionada mudar
  useEffect(() => {
    if (!selectedChurchId) return;
    const fetchNuvem = async () => {
      try {
        const { data: mData } = await supabase.from('membros').select('*').eq('church_id', selectedChurchId).order('nome');
        if (mData) {
          setMembros(mData.map(m => ({ 
            nome: m.nome, 
            cargo: m.cargo || '', 
            genero: m.genero as 'masculino' | 'feminino',
            created_at: m.created_at
          })));
        }

        const { data: hData } = await supabase.from('atas').select('*').eq('church_id', selectedChurchId).order('created_at', { ascending: false });
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
          })));
        }
      } catch (err) {
        console.error("Erro ao sincronizar com Supabase", err);
      }
    };
    fetchNuvem();
  }, [selectedChurchId, setMembros, setHistorico]);

  const updateField = useCallback(<K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMes = useCallback((mes: 'mes1' | 'mes2', field: keyof DadosFinanceiros, value: string) => {
    setFormData(prev => {
      const updated = { ...prev[mes], [field]: value };
      if (['caixaInicial', 'entradas', 'saidas'].includes(field)) {
        const parse = (v: string) => {
          const n = parseFloat(v.replace(/[^\d,.-]/g, '').replace(',', '.'));
          return isNaN(n) ? 0 : n;
        };
        const final = parse(updated.caixaInicial) + parse(updated.entradas) - parse(updated.saidas);
        updated.caixaFinal = `R$${final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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

  const updateDeliberacao = useCallback((id: string, texto: string) => {
    setFormData(prev => ({
      ...prev,
      deliberacoes: prev.deliberacoes.map(d => d.id === id ? { ...d, texto } : d),
    }));
  }, []);

  const removeDeliberacao = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      deliberacoes: prev.deliberacoes.filter(d => d.id !== id),
    }));
  }, []);

  const addMembro = useCallback(async (membro: Membro) => {
    setMembros(prev => [...prev, membro]);
    if (profile?.church_id) {
      await supabase.from('membros').insert({
        nome: membro.nome, cargo: membro.cargo, genero: membro.genero, church_id: profile.church_id
      });
    }
  }, [setMembros, profile]);

  const removeMembro = useCallback(async (index: number) => {
    const membro = membros[index];
    setMembros(prev => prev.filter((_, i) => i !== index));
    if (profile?.church_id && membro) {
      await supabase.from('membros').delete().eq('church_id', profile.church_id).eq('nome', membro.nome);
    }
  }, [membros, setMembros, profile]);

  const updateMembro = useCallback(async (index: number, membro: Membro) => {
    const membroAntigo = membros[index];
    setMembros(prev => prev.map((m, i) => i === index ? membro : m));
    if (profile?.church_id && membroAntigo) {
      await supabase.from('membros')
        .update({ nome: membro.nome, cargo: membro.cargo, genero: membro.genero })
        .eq('church_id', profile.church_id)
        .eq('nome', membroAntigo.nome);
    }
  }, [membros, setMembros, profile]);

  const togglePresenca = useCallback((nome: string) => {
    setMembrosPresentes(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  }, []);

  const gerarAta = useCallback(() => {
    const d = formData;
    
    const getMembro = (nome: string) => membros.find(mb => mb.nome === nome);
    const artigo = (nome: string) => getMembro(nome)?.genero === 'feminino' ? 'a' : 'o';
    const artigoMaiusc = (nome: string) => getMembro(nome)?.genero === 'feminino' ? 'A' : 'O';
    const refMembro = (nome: string) => {
      const m = getMembro(nome);
      if (m?.cargo) return `${artigo(nome)} ${m.cargo} ${nome}`;
      return `${m?.genero === 'feminino' ? 'a irmã' : 'o irmão'} ${nome}`;
    };
    const refMembroMaiusc = (nome: string) => {
      const m = getMembro(nome);
      if (m?.cargo) return `${artigoMaiusc(nome)} ${m.cargo} ${nome}`;
      return `${m?.genero === 'feminino' ? 'A irmã' : 'O irmão'} ${nome}`;
    };
    const qualidadeSecretario = (nome: string) => {
      const m = getMembro(nome);
      if (m?.cargo) return m.cargo;
      return m?.genero === 'feminino' ? 'Secretária' : 'Secretário';
    };

    let aberturaTemplate = churchConfig?.aberturaTemplate || "ATA DE ASSEMBLEIA [TIPO] DA IGREJA EVANGÉLICA AVIVA. Aos [DIA] dias do mês de [MÊS] de [ANO], às [HORA], no templo da IGREJA EVANGÉLICA AVIVA, situada na [LOCAL], reuniram-se os membros ativos desta igreja, sob a direção d[PASTOR], para deliberar sobre [ASSUNTO]. Após ter feito a chamada dos membros presentes, e havendo quórum suficiente, [PASTOR] declara instalada a assembleia e abertos os trabalhos.";
    let fechamentoTemplate = churchConfig?.fechamentoTemplate || "Feito isso, [PASTOR] encerrou esta assembleia [TIPO], às [HORA_FIM], orando e impetrando a bênção apostólica. E, por não haver mais nada a ser tratado, eu, [SECRETARIO], na qualidade de [CARGO_SEC], lavrei a presente Ata, que após lida e aprovada pela Assembleia, vai assinada, por mim e pelo pastor.";

    const substituirVariaveis = (texto: string) => {
      const data = new Date(d.dataReuniao + 'T12:00:00');
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      
      return texto
        .replace(/\[DIA\]/g, isNaN(data.getDate()) ? "___" : data.getDate().toString())
        .replace(/\[MÊS\]/g, isNaN(data.getMonth()) ? "___" : meses[data.getMonth()])
        .replace(/\[ANO\]/g, isNaN(data.getFullYear()) ? "___" : data.getFullYear().toString())
        .replace(/\[HORA\]/g, d.horaInicio || "___")
        .replace(/\[HORA_FIM\]/g, d.horaTermino || "___")
        .replace(/\[LOCAL\]/g, d.localReuniao || "___")
        .replace(/\[PASTOR\]/g, d.pastorDirigente ? refMembro(d.pastorDirigente) : "___")
        .replace(/\[SECRETARIO\]/g, d.nomeSecretario || "___")
        .replace(/\[CARGO_SEC\]/g, qualidadeSecretario(d.nomeSecretario))
        .replace(/\[TIPO\]/g, d.tipoAssembleia || "___")
        .replace(/\[ASSUNTO\]/g, d.assuntosPrincipais || "___");
    };

    let texto = `${substituirVariaveis(aberturaTemplate)}\n\n`;
    
    if (d.hinoHarpa || d.palavraInicial) {
      texto += `Seguiu-se com o canto do hino ${d.hinoHarpa || ""} e a leitura de ${d.palavraInicial || ""}, com uma breve palavra sobre esta porção bíblica. `;
    }

    texto += `Em seguida, convidou-se ${refMembro(d.nomeSecretario)} para ler a ata do mês anterior. `;
    if (d.aprovacaoAtaAnterior === 'unanimidade') {
      texto += `A mesma foi aprovada por todos os presentes por unanimidade. `;
    } else {
      texto += `Houve ressalvas por parte de ${refMembro(d.ressalvaMembro)}: "${d.ressalvaMotivos}". `;
    }
    texto += `\n\n`;

    if (d.aprovacaoFinanceira) {
      texto += `RELATÓRIO FINANCEIRO:\n`;
      texto += `Com a palavra, ${refMembro(d.tesoureira)} informou o movimento financeiro do mês de ${d.mes1.nome}: Caixa Inicial de ${d.mes1.caixaInicial}, Entradas de ${d.mes1.entradas}, Saídas de ${d.mes1.saidas} e Caixa Final de ${d.mes1.caixaFinal}. `;
      
      if (d.incluirMes2) {
        texto += `Também apresentou o mês de ${d.mes2.nome}: Caixa Inicial de ${d.mes2.caixaInicial}, Entradas de ${d.mes2.entradas}, Saídas de ${d.mes2.saidas} e Caixa Final de ${d.mes2.caixaFinal}. `;
      }
      
      if (d.aprovadorConselhoFiscal) {
        texto += `Houve total apoio do conselho fiscal, com aprovação d${refMembro(d.aprovadorConselhoFiscal)}. `;
      }
      texto += `A assembleia aprovou o relatório financeiro de forma unânime.\n\n`;
    }

    if (d.deliberacoes.length > 0) {
      texto += `REGISTROS E DELIBERAÇÕES:\n`;
      d.deliberacoes.forEach((item, index) => {
        texto += `${index + 1}. ${item.texto}\n`;
      });
      texto += `\n`;
    }

    texto += `${substituirVariaveis(fechamentoTemplate)}\n\n`;
    texto += `{{ASSINATURAS}}`;
    
    setAtaGerada(texto);
    return texto;
  }, [formData, membros, membrosPresentes, churchConfig]);

  const salvarNoHistorico = useCallback((texto: string) => {
    const d = formData;
    if (!d.dataReuniao) return;
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    const titulo = `${formatDate(d.dataReuniao)} – Assembleia ${d.tipoAssembleia}`;
    const novaAta: AtaHistorico = {
      id: Date.now(), titulo, data: d.dataReuniao, tipo: d.tipoAssembleia,
      dados: { ...d }, membrosPresentes: [...membrosPresentes],
      ataTexto: texto, geradoEm: new Date().toISOString(),
      fotosAssinaturaUrls: d.fotosAssinaturaUrls || [],
    };
    setHistorico(prev => {
      const filtered = prev.filter(a => !(a.data === d.dataReuniao && a.tipo === d.tipoAssembleia));
      return [novaAta, ...filtered];
    });

    if (profile?.church_id && user) {
      supabase.from('atas').insert({
        titulo,
        conteudo: texto,
        dados_json: { ...d, membrosPresentes },
        church_id: profile.church_id,
        created_by: user.id,
        // Mantemos a primeira foto na coluna individual para compatibilidade, 
        // mas a lista completa vai dentro do dados_json
        foto_assinatura_url: d.fotosAssinaturaUrls?.[0] || null 
      }).then(({ error }) => {
        if (error) {
          console.error("Erro ao salvar ata no Supabase:", error);
          toast.error("Erro ao salvar na nuvem: " + error.message);
        } else {
          toast.success("Ata salva na nuvem com sucesso!");
        }
      });
    }
  }, [formData, membrosPresentes, setHistorico, profile, user]);

  const carregarDoHistorico = useCallback((ata: AtaHistorico) => {
    setFormData(ata.dados);
    setMembrosPresentes(ata.membrosPresentes);
    setAtaGerada(ata.ataTexto);
  }, []);

  const excluirDoHistorico = useCallback(async (id: number | string) => {
    setHistorico(prev => prev.filter(a => a.id !== id));
    if (typeof id === 'string' && profile?.church_id) {
      await supabase.from('atas').delete().eq('id', id);
    }
  }, [setHistorico, profile]);

  const limparFormulario = useCallback(() => {
    setFormData(initialFormData);
    setMembrosPresentes([]);
    setAtaGerada('');
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
    const nomesTeste = ["Airton Siqueira", "Adlai Brum Siqueira Marques", "Thayná Ramos da Silva Barbosa", "Fábio Vieitas Marques"];
    const testMembros: Membro[] = [
      { nome: "Airton Siqueira", cargo: "1º Dirigente, Pastor", genero: "masculino" },
      { nome: "Adlai Brum Siqueira Marques", cargo: "1ª Secretária", genero: "feminino" },
      { nome: "Thayná Ramos da Silva Barbosa", cargo: "1ª Tesoureira", genero: "feminino" },
      { nome: "Fábio Vieitas Marques", cargo: "2º Dirigente, Presbítero", genero: "masculino" },
    ];
    setMembros(prev => {
      const newMembros = [...prev];
      testMembros.forEach(tm => {
        if (!newMembros.some(m => m.nome === tm.nome)) newMembros.push(tm);
      });
      return newMembros;
    });
    setMembrosPresentes(nomesTeste);
    setFormData(prev => ({
      ...prev,
      dataReuniao: '2025-11-08', horaInicio: '19:30', horaTermino: '21:00',
      pastorDirigente: 'Airton Siqueira', nomeSecretario: 'Adlai Brum Siqueira Marques',
      tesoureira: 'Thayná Ramos da Silva Barbosa',
      localReuniao: 'Rua Principal, nº 100, Floresta, São Francisco de Itabapoana/RJ',
      assuntosPrincipais: 'assuntos gerais da igreja',
      palavraInicial: 'Salmos 133', hinoHarpa: 'H.C. 151',
      mes1: { nome: 'Outubro', ano: '2025', caixaInicial: 'R$2.345,67', entradas: 'R$3.210,00', saidas: 'R$1.890,50', caixaFinal: 'R$3.665,17' },
      deliberacoes: [{ id: '1', texto: 'Com a oportunidade da palavra, foi anunciado o mutirão de limpeza para o próximo sábado.' }],
    }));
  }, [setMembros]);

  return {
    formData, updateField, updateMes,
    membros, addMembro, removeMembro, updateMembro,
    membrosPresentes, setMembrosPresentes, togglePresenca,
    deliberacoes: formData.deliberacoes, addDeliberacao, updateDeliberacao, removeDeliberacao,
    ataGerada, setAtaGerada, gerarAta,
    historico, salvarNoHistorico, carregarDoHistorico, excluirDoHistorico,
    limparFormulario, preencherTeste,
    defaults, saveDefault, loadDefaults,
    selectedChurchId, setSelectedChurchId
  };
}
