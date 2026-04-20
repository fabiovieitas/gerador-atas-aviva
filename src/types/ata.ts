export interface Membro {
  nome: string;
  cargo: string;
  genero: 'masculino' | 'feminino';
}

export interface DadosFinanceiros {
  nome: string;
  ano: string;
  caixaInicial: string;
  entradas: string;
  saidas: string;
  caixaFinal: string;
}

export interface Deliberacao {
  id: string;
  texto: string;
}

export interface AtaFormData {
  dataReuniao: string;
  tipoAssembleia: 'Ordinária' | 'Extraordinária';
  horaInicio: string;
  horaTermino: string;
  semQuorum: boolean;
  horaSegundaChamada: string;
  pastorDirigente: string;
  localReuniao: string;
  assuntosPrincipais: string;
  palavraInicial: string;
  hinoHarpa: string;
  aprovacaoAtaAnterior: 'unanimidade' | 'ressalvas';
  ressalvaMembro: string;
  ressalvaMotivos: string;
  ressalvaEsclarecimentos: string;
  ressalvaPosicaoFinal: 'manteve' | 'retirou';
  tesoureira: string;
  relatorioMultiplosMeses: boolean;
  descricaoPeriodo: string;
  mes1: DadosFinanceiros;
  mes2: DadosFinanceiros;
  incluirMes2: boolean;
  aprovadorConselhoFiscal: string;
  aprovacaoFinanceira: boolean;
  deliberacoes: Deliberacao[];
  nomeSecretario: string;
}

export interface AtaHistorico {
  id: string | number;
  titulo: string;
  data: string;
  tipo: string;
  dados: AtaFormData;
  membrosPresentes: string[];
  ataTexto: string;
  geradoEm: string;
}
