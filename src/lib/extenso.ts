const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function grupoExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  const partes: string[] = [];

  if (c > 0) partes.push(centenas[c]);

  if (d === 1) {
    partes.push(especiais[u]);
  } else {
    if (d > 1) partes.push(dezenas[d]);
    if (u > 0) partes.push(unidades[u]);
  }

  return partes.join(' e ');
}

function inteiroExtenso(n: number): string {
  if (n === 0) return 'zero';

  const grupos: { valor: number; singular: string; plural: string }[] = [
    { valor: 1_000_000_000, singular: 'bilhão', plural: 'bilhões' },
    { valor: 1_000_000, singular: 'milhão', plural: 'milhões' },
    { valor: 1_000, singular: 'mil', plural: 'mil' },
    { valor: 1, singular: '', plural: '' },
  ];

  const partes: string[] = [];
  let resto = n;

  for (const g of grupos) {
    const qtd = Math.floor(resto / g.valor);
    resto = resto % g.valor;
    if (qtd > 0) {
      if (g.valor === 1) {
        partes.push(grupoExtenso(qtd));
      } else if (qtd === 1 && g.valor === 1000) {
        partes.push('mil');
      } else {
        const txt = grupoExtenso(qtd);
        const label = qtd === 1 ? g.singular : g.plural;
        partes.push(`${txt} ${label}`.trim());
      }
    }
  }

  // Join with ", " but last group with " e "
  if (partes.length <= 1) return partes[0] || 'zero';
  const last = partes.pop()!;
  return partes.join(', ') + ' e ' + last;
}

/**
 * Converts a currency string like "R$1.389,70" to extenso.
 * Returns: "R$1.389,70 (mil, trezentos e oitenta e nove reais e setenta centavos)"
 */
export function valorPorExtenso(valorStr: string): string {
  // Clean up - extract number
  const cleaned = valorStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return valorStr;

  const inteiro = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - inteiro) * 100);

  let extenso = '';

  if (inteiro === 0 && centavos === 0) {
    extenso = 'zero reais';
  } else if (inteiro === 0) {
    extenso = `${inteiroExtenso(centavos)} centavo${centavos === 1 ? '' : 's'}`;
  } else if (centavos === 0) {
    extenso = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`;
  } else {
    extenso = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'} e ${inteiroExtenso(centavos)} centavo${centavos === 1 ? '' : 's'}`;
  }

  return `${valorStr} (${extenso})`;
}
