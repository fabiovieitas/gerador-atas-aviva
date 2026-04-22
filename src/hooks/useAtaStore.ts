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
  const { profile, user, loading: authLoading } = useAuth();
  const [ataGerada, setAtaGerada] = useState('');
  const [defaults, setDefaults] = useLocalStorage<Record<string, string>>('ataDefaults', {});
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [churchInfo, setChurchInfo] = useState<{nome: string, cnpj: string, endereco: string, logo_url: string} | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.church_id && !selectedChurchId) {
      setSelectedChurchId(profile.church_id);
    }
  }, [profile?.church_id, selectedChurchId, authLoading]);

  useEffect(() => {
    if (!selectedChurchId) return;
    const fetchNuvem = async () => {
      try {
        const { data: churchData } = await supabase.from('churches').select('nome, cnpj, endereco, logo_url').eq('id', selectedChurchId).single();
        if (churchData) {
          setChurchInfo(churchData as any);
        }

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
        console.error(err);
      }
    };
    fetchNuvem();
  }, [selectedChurchId]);

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
  }, [profile]);

  const removeMembro = useCallback(async (index: number) => {
    const membro = membros[index];
    setMembros(prev => prev.filter((_, i) => i !== index));
    if (profile?.church_id && membro) {
      await supabase.from('membros').delete().eq('church_id', profile.church_id).eq('nome', membro.nome);
    }
  }, [membros, profile]);

  const updateMembro = useCallback(async (index: number, membro: Membro) => {
    const membroAntigo = membros[index];
    setMembros(prev => prev.map((m, i) => i === index ? membro : m));
    if (profile?.church_id && membroAntigo) {
      await supabase.from('membros')
        .update({ nome: membro.nome, cargo: membro.cargo, genero: membro.genero })
        .eq('church_id', profile.church_id)
        .eq('nome', membroAntigo.nome);
    }
  }, [membros, profile]);

  const togglePresenca = useCallback((nome: string) => {
    setMembrosPresentes(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  }, []);

  const gerarAta = useCallback(() => {
    const d = formData;
    const getMembro = (nome: string) => membros.find(mb => mb.nome === nome);
    const refMembro = (nome: string) => {
      const m = getMembro(nome);
      if (m?.cargo) return `${m.genero === 'feminino' ? 'a' : 'o'} ${m.cargo} ${nome}`;
      return `${m?.genero === 'feminino' ? 'a irmã' : 'o irmão'} ${nome}`;
    };

    const data = d.dataReuniao ? new Date(d.dataReuniao + 'T12:00:00') : new Date();
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const dataExtenso = `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;

    let texto = `ATA DE ASSEMBLEIA ${d.tipoAssembleia.toUpperCase()} DA IGREJA EVANGÉLICA AVIVA. `;
    texto += `Aos ${dataExtenso}, às ${d.horaInicio || '___'}h, no templo da IGREJA EVANGÉLICA AVIVA, situada na ${d.localReuniao || '___'}, `;
    texto += `reuniram-se os membros ativos desta igreja, sob a direção d${refMembro(d.pastorDirigente)}, para deliberar sobre ${d.assuntosPrincipais || '___'}. `;
    texto += `Após ter feito a chamada dos membros presentes, e havendo quórum suficiente, ${refMembro(d.pastorDirigente)} declara instalada a assembleia e abertos os trabalhos.\n\n`;

    if (d.hinoHarpa || d.palavraInicial) {
      texto += `Seguiu-se com o canto do hino ${d.hinoHarpa || ""} e a leitura de ${d.palavraInicial || ""}. `;
    }

    if (d.aprovacaoFinanceira) {
      texto += `RELATÓRIO FINANCEIRO: Com a palavra, ${refMembro(d.tesoureira)} informou o movimento financeiro do mês de ${d.mes1.nome}: Saldo Atual de ${d.mes1.caixaFinal}. `;
      texto += `A assembleia aprovou o relatório de forma unânime.\n\n`;
    }

    if (d.deliberacoes.length > 0) {
      texto += `REGISTROS E DELIBERAÇÕES:\n`;
      d.deliberacoes.forEach((item, index) => {
        texto += `${index + 1}. ${item.texto}\n`;
      });
      texto += `\n`;
    }

    texto += `Nada mais havendo a tratar, a reunião foi encerrada às ${d.horaTermino || '___'} com uma oração.\n\n`;
    texto += `{{ASSINATURAS}}`;
    
    return texto;
  }, [formData, membros]);

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
      supabase.from('atas').insert({
        titulo, conteudo: texto, dados_json: { ...d, membrosPresentes },
        church_id: profile.church_id, created_by: user.id
      }).then();
    }
  }, [formData, membrosPresentes, profile, user]);

  const carregarDoHistorico = useCallback((ata: AtaHistorico) => {
    setFormData(ata.dados);
    setMembrosPresentes(ata.membrosPresentes);
    setAtaGerada(ata.ataTexto);
  }, []);

  const excluirDoHistorico = useCallback(async (id: number | string) => {
    setHistorico(prev => prev.filter(a => a.id !== id));
    if (typeof id === 'string') {
      await supabase.from('atas').delete().eq('id', id);
    }
  }, []);

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
    setFormData(prev => ({
      ...prev,
      dataReuniao: '2025-11-08', horaInicio: '19:30', horaTermino: '21:00',
      pastorDirigente: 'Airton Siqueira', nomeSecretario: 'Adlai Brum Siqueira Marques',
      tesoureira: 'Thayná Ramos da Silva Barbosa',
      localReuniao: 'Templo Sede', assuntosPrincipais: 'assuntos gerais',
    }));
  }, []);

  return {
    formData, updateField, updateMes,
    membros, addMembro, removeMembro, updateMembro,
    membrosPresentes, setMembrosPresentes, togglePresenca,
    deliberacoes: formData.deliberacoes, addDeliberacao, updateDeliberacao, removeDeliberacao,
    ataGerada, setAtaGerada, gerarAta,
    historico, salvarNoHistorico, carregarDoHistorico, excluirDoHistorico,
    limparFormulario, preencherTeste,
    defaults, saveDefault, loadDefaults,
    selectedChurchId, setSelectedChurchId,
    churchInfo
  };
}
