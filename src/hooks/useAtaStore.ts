import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Membro, AtaFormData, AtaHistorico, DadosFinanceiros, Deliberacao } from '@/types/ata';
import { valorPorExtenso } from '@/lib/extenso';

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
};

export function useAtaStore() {
  const [membros, setMembros] = useLocalStorage<Membro[]>('membrosAvivaAta', []);
  const [historico, setHistorico] = useLocalStorage<AtaHistorico[]>('atasAvivaHistorico2025', []);
  const [formData, setFormData] = useState<AtaFormData>(initialFormData);
  const [membrosPresentes, setMembrosPresentes] = useState<string[]>([]);
  const [ataGerada, setAtaGerada] = useState('');
  const [defaults, setDefaults] = useLocalStorage<Record<string, string>>('ataDefaults', {});

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

  const addMembro = useCallback((membro: Membro) => {
    setMembros(prev => [...prev, membro]);
  }, [setMembros]);

  const removeMembro = useCallback((index: number) => {
    setMembros(prev => prev.filter((_, i) => i !== index));
  }, [setMembros]);

  const updateMembro = useCallback((index: number, membro: Membro) => {
    setMembros(prev => prev.map((m, i) => i === index ? membro : m));
  }, [setMembros]);

  const togglePresenca = useCallback((nome: string) => {
    setMembrosPresentes(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  }, []);

  const gerarAta = useCallback(() => {
    const d = formData;
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '___';
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const artigo = (nome: string) => {
      const m = membros.find(mb => mb.nome === nome);
      return m?.genero === 'feminino' ? 'a' : 'o';
    };

    const artigoMaiusc = (nome: string) => {
      const m = membros.find(mb => mb.nome === nome);
      return m?.genero === 'feminino' ? 'A' : 'O';
    };

    const cargo = (nome: string) => {
      const m = membros.find(mb => mb.nome === nome);
      return m?.cargo || '';
    };

    let texto = '';
    texto += `ATA DE ASSEMBLEIA ${d.tipoAssembleia.toUpperCase()} DA IGREJA EVANGÉLICA AVIVA, EM FLORESTA, SÃO FRANCISCO DE ITABAPOANA (RJ), NA FORMA ABAIXO:\n\n`;
    texto += `Aos ${formatDate(d.dataReuniao)}, às ${d.horaInicio || '___'}h, `;
    texto += `no templo da IGREJA EVANGÉLICA AVIVA, situada na ${d.localReuniao || '___'}, `;
    texto += `reuniram-se, em Assembleia ${d.tipoAssembleia}, os membros ativos desta igreja`;

    if (d.semQuorum) {
      texto += `. Não havendo quórum na primeira chamada, foi realizada segunda chamada às ${d.horaSegundaChamada || '___'}h`;
    }

    texto += `, sob a direção d${artigo(d.pastorDirigente)} ${cargo(d.pastorDirigente)} ${d.pastorDirigente || '___'}`;
    texto += `, para deliberar sobre ${d.assuntosPrincipais || '___'}.\n\n`;

    // Chamada e abertura
    texto += `Após ter feito a chamada dos membros presentes, e havendo quórum suficiente, `;
    texto += `${artigo(d.pastorDirigente)} ${cargo(d.pastorDirigente)} ${d.pastorDirigente || '___'} declara instalada a assembleia e abertos os trabalhos.`;

    if (d.palavraInicial) {
      texto += ` Seguindo com a leitura de ${d.palavraInicial}`;
      if (d.hinoHarpa) texto += ` e o canto do hino ${d.hinoHarpa}`;
      texto += `, apresentando uma breve palavra sobre esta porção bíblica.`;
    }

    texto += ` Em seguida, convida ${artigo(d.nomeSecretario) === 'a' ? 'a' : 'o'} ${cargo(d.nomeSecretario)} ${d.nomeSecretario || '___'} para ler a ata do mês anterior`;

    // Ata anterior
    if (d.aprovacaoAtaAnterior === 'unanimidade') {
      texto += `, sendo a mesma aprovada por todos os presentes.\n\n`;
    } else {
      texto += `. ${artigoMaiusc(d.ressalvaMembro)} membro ${d.ressalvaMembro || '___'} apresentou ressalvas: "${d.ressalvaMotivos || '___'}". `;
      texto += `Foram prestados os seguintes esclarecimentos: "${d.ressalvaEsclarecimentos || '___'}". `;
      if (d.ressalvaPosicaoFinal === 'retirou') {
        texto += `Após os esclarecimentos, ${artigo(d.ressalvaMembro)} membro retirou a ressalva e a ata foi aprovada.\n\n`;
      } else {
        texto += `${artigoMaiusc(d.ressalvaMembro)} membro manteve sua posição.\n\n`;
      }
    }

    // Relatório financeiro (sem título de seção)
    const renderMes = (mes: DadosFinanceiros) => {
      return `do mês de ${mes.nome || '___'} de ${mes.ano || '___'}, foi de ${valorPorExtenso(mes.caixaInicial || 'R$0,00')}, ` +
        `a entrada de ${valorPorExtenso(mes.entradas || 'R$0,00')}, ` +
        `saída de ${valorPorExtenso(mes.saidas || 'R$0,00')} ` +
        `e tendo, como caixa final, a quantia de ${valorPorExtenso(mes.caixaFinal || 'R$0,00')}`;
    };

    texto += `Com a palavra, ${d.tesoureira || '___'} informou que o caixa inicial da igreja, ${renderMes(d.mes1)}.\n\n`;

    if (d.incluirMes2 && d.relatorioMultiplosMeses) {
      texto += `Ainda, ${artigo(d.tesoureira) === 'a' ? 'a mesma' : 'o mesmo'} apresentou o relatório financeiro ${renderMes(d.mes2)}.\n\n`;
    }

    if (d.aprovadorConselhoFiscal) {
      texto += `Após a apresentação, houve total apoio do conselho fiscal, com a aprovação d${artigo(d.aprovadorConselhoFiscal)} ${d.aprovadorConselhoFiscal}`;
    }

    if (d.aprovacaoFinanceira) {
      texto += `, e passou para a igreja a aprovação do relatório e seu conteúdo, sendo o mesmo aprovado de forma unânime.`;
    }
    texto += `\n\n`;

    // Deliberações (sem título de seção, fluxo contínuo)
    if (d.deliberacoes.length > 0) {
      texto += `Continuando com a palavra, `;
      d.deliberacoes.forEach((del, i) => {
        if (del.texto.trim()) {
          texto += `${del.texto} `;
        }
      });
      texto += `\n\n`;
    }

    // Encerramento
    texto += `Feito isso, ${artigo(d.pastorDirigente)} ${cargo(d.pastorDirigente)} ${d.pastorDirigente || '___'} encerrou esta assembleia ${d.tipoAssembleia}, às ${d.horaTermino || '___'}h, orando e impetrando a bênção apostólica. E, por não haver mais nada a ser tratado, eu, ${d.nomeSecretario || '___'}, na qualidade de Secretário(a), lavrei a presente Ata, que após lida e aprovada pela Assembleia, vai assinada, por mim e pelo pastor.\n\n`;
    texto += `{{ASSINATURAS}}`;

    setAtaGerada(texto);
    return texto;
  }, [formData, membros, membrosPresentes]);

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
    };
    setHistorico(prev => {
      const filtered = prev.filter(a => !(a.data === d.dataReuniao && a.tipo === d.tipoAssembleia));
      return [novaAta, ...filtered];
    });
  }, [formData, membrosPresentes, setHistorico]);

  const carregarDoHistorico = useCallback((ata: AtaHistorico) => {
    setFormData(ata.dados);
    setMembrosPresentes(ata.membrosPresentes);
    setAtaGerada(ata.ataTexto);
  }, []);

  const excluirDoHistorico = useCallback((id: number) => {
    setHistorico(prev => prev.filter(a => a.id !== id));
  }, [setHistorico]);

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
      palavraInicial: 'Salmos 133', hinoHarpa: 'H.C. 151',
      mes1: { nome: 'Outubro', ano: '2025', caixaInicial: 'R$2.345,67', entradas: 'R$3.210,00', saidas: 'R$1.890,50', caixaFinal: 'R$3.665,17' },
      deliberacoes: [{ id: '1', texto: 'Fica aprovado o mutirão de limpeza para o próximo sábado.' }],
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
  };
}
