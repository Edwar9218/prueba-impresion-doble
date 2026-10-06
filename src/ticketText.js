// ticketText.js - utilidades puras para armar el texto del ticket (sin dependencias).

// Tamaños de letra (de menor a mayor). El 4 es el "doble" probado en la PT-210 (16 caracteres por renglón).
// w / h = veces que se agranda el ancho / el alto (GS ! n). cols = caracteres por renglón en 58 mm.
// (La fuente B no sirve en la PT-210: no imprime nada, por eso no se usa.)
export const TAMANOS = [
  { n: 1, w: 1, h: 1, cols: 32, etiqueta: 'Normal', detalle: 'Letra pequeña · ≈32 letras por renglón' },
  // spacing = puntos extra entre letras (ESC SP n). Con 3: cada letra ocupa 12+3 puntos -> 384/15 ≈ 25 por renglón.
  { n: 2, w: 1, h: 2, spacing: 3, cols: 25, etiqueta: 'Normal, alta', detalle: 'Más alta y con letras más separadas · ≈25 por renglón' },
  { n: 3, w: 2, h: 1, cols: 16, etiqueta: 'Ancha', detalle: 'Más ancha, misma altura · ≈16 por renglón' },
  { n: 4, w: 2, h: 2, cols: 16, etiqueta: 'Doble (la de siempre)', detalle: 'El doble de ancha y de alta · ≈16 por renglón' },
  { n: 5, w: 3, h: 3, cols: 10, etiqueta: 'Triple', detalle: 'Tres veces más grande · ≈10 por renglón' },
  { n: 6, w: 4, h: 4, cols: 8, etiqueta: 'Cuádruple', detalle: 'Cuatro veces más grande · ≈8 por renglón' },
];

export function clampSize(n) {
  const v = Math.round(Number(n)) || 1;
  return Math.min(TAMANOS.length, Math.max(1, v));
}

export const presetDeTamano = (size) => TAMANOS[clampSize(size) - 1];

// Caracteres por renglón según el tamaño elegido
export const columnasPorTamano = (size) => presetDeTamano(size).cols;

// ---------------------------------------------------------------------------
// Limpieza del texto antes de imprimir.
// La PT-210 (y casi todas las impresoras térmicas baratas de 58 mm) solo imprime bien el ASCII
// básico: con una tilde, una ñ, un emoji o un carácter raro de Word / WhatsApp / páginas web
// dibuja una raya negra o basura. Por eso TODO texto (escrito, pegado o copiado) pasa por aquí
// y sale solo con caracteres ASCII: á -> a, ñ -> n, “ ” -> ", — -> -, emojis se quitan, etc.
// ---------------------------------------------------------------------------

// Letra base -> todas las variantes con tilde / diéresis / cedilla que se convierten en ella.
const EQUIVALENCIAS_LETRAS = {
  a: 'àáâãäåāăąǎǟǡǻȁȃȧ', A: 'ÀÁÂÃÄÅĀĂĄǍǞǠǺȀȂȦ',
  c: 'çćĉċč', C: 'ÇĆĈĊČ',
  d: 'ďđð', D: 'ĎĐÐ',
  e: 'èéêëēĕėęěȅȇȩ', E: 'ÈÉÊËĒĔĖĘĚȄȆȨ',
  g: 'ĝğġģǧ', G: 'ĜĞĠĢǦ',
  h: 'ĥħ', H: 'ĤĦ',
  i: 'ìíîïĩīĭįıǐȉȋ', I: 'ÌÍÎÏĨĪĬĮİǏȈȊ',
  j: 'ĵ', J: 'Ĵ',
  k: 'ķ', K: 'Ķ',
  l: 'ĺļľŀł', L: 'ĹĻĽĿŁ',
  n: 'ñńņňŉ', N: 'ÑŃŅŇ',
  o: 'òóôõöøōŏőǒǫǿȍȏȫȭȯȱ', O: 'ÒÓÔÕÖØŌŎŐǑǪǾȌȎȪȬȮȰ',
  r: 'ŕŗřȑȓ', R: 'ŔŖŘȐȒ',
  s: 'śŝşšș', S: 'ŚŜŞŠȘ',
  t: 'ţťŧț', T: 'ŢŤŦȚ',
  u: 'ùúûüũūŭůűųǔǖǘǚǜȕȗ', U: 'ÙÚÛÜŨŪŬŮŰŲǓǕǗǙǛȔȖ',
  w: 'ŵ', W: 'Ŵ',
  y: 'ýÿŷ', Y: 'ÝŶŸ',
  z: 'źżž', Z: 'ŹŻŽ',
};

// Símbolos y letras especiales -> su equivalente en ASCII ('' = se quita).
const EQUIVALENCIAS_ESPECIALES = {
  // Comillas y apóstrofes
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'", '´': "'", '`': '`', 'ʼ': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"', '«': '"', '»': '"', '‹': "'", '›': "'",
  // Guiones y rayas
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-', '−': '-', '﹘': '-', '－': '-',
  // Puntos suspensivos y viñetas
  '…': '...', '•': '*', '‣': '*', '◦': '*', '▪': '*', '▫': '*', '●': '*', '○': '*', '■': '*', '□': '*', '·': '*', '∙': '*', '⁃': '-',
  // Letras especiales
  'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'þ': 'th', 'Þ': 'TH',
  // Símbolos
  '¿': '', '¡': '', '°': 'o', 'º': 'o', 'ª': 'a', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '¢': 'c',
  '×': 'x', '÷': '/', '±': '+/-', '½': '1/2', '¼': '1/4', '¾': '3/4', '™': 'TM', '®': '(R)', '©': '(c)',
  '№': 'No', '→': '->', '←': '<-', '⇒': '=>', '✓': 'v', '✔': 'v', '✗': 'x', '✘': 'x',
  // Espacios raros -> espacio normal
  '\u00a0': ' ', '\u1680': ' ', '\u2000': ' ', '\u2001': ' ', '\u2002': ' ', '\u2003': ' ', '\u2004': ' ',
  '\u2005': ' ', '\u2006': ' ', '\u2007': ' ', '\u2008': ' ', '\u2009': ' ', '\u200a': ' ', '\u202f': ' ',
  '\u205f': ' ', '\u3000': ' ', '\t': ' ',
  // Saltos de línea raros -> salto normal
  '\u2028': '\n', '\u2029': '\n', '\u0085': '\n',
};

const TABLA_ASCII = (() => {
  const t = Object.assign({}, EQUIVALENCIAS_ESPECIALES);
  Object.keys(EQUIVALENCIAS_LETRAS).forEach((base) => {
    EQUIVALENCIAS_LETRAS[base].split('').forEach((c) => {
      t[c] = base;
    });
  });
  return t;
})();

// Marcas combinadas sueltas (tildes separadas de su letra), caracteres invisibles y selectores de emoji:
// se quitan sin dejar rastro. (Texto en NFD, el de algunos teclados y de macOS: "e" + tilde.)
const INVISIBLES = /[\u0300-\u036f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufeff]/;

/**
 * Deja el texto solo con caracteres ASCII que la impresora imprime sin problema.
 * - Tildes, ñ, ü, ç... -> letra sin tilde (teléfono -> telefono, Muñoz -> Munoz).
 * - Comillas y guiones "elegantes" -> los normales. Espacios raros -> espacio normal.
 * - Emojis, símbolos y cualquier otro carácter que la impresora no entiende -> se quitan.
 * - Los saltos de línea se conservan (\r\n -> \n).
 */
export function limpiarTexto(texto) {
  const entrada = String(texto == null ? '' : texto).replace(/\r\n?/g, '\n');
  let salida = '';
  let quitado = false; // se quitó algo (emoji...) desde el último carácter visible: evita espacios dobles

  for (const ch of entrada) {
    let r;
    if (ch === '\n') r = '\n';
    else if (ch >= ' ' && ch <= '~') r = ch; // ASCII visible
    else if (INVISIBLES.test(ch)) continue; // no deja espacio ni marca
    else if (Object.prototype.hasOwnProperty.call(TABLA_ASCII, ch)) r = TABLA_ASCII[ch];
    else r = ''; // emoji u otro carácter sin equivalente

    if (r === '') {
      quitado = true;
      continue;
    }
    if (r === ' ' && quitado && (salida === '' || salida.endsWith(' ') || salida.endsWith('\n'))) continue;
    salida += r;
    if (r !== ' ') quitado = false;
  }
  return salida;
}

// ¿Después de limpiar no queda nada que imprimir? (vacío, solo espacios o solo emojis)
export const esTextoVacio = (texto) => limpiarTexto(texto).trim().length === 0;

// Las líneas de 24 guiones del editor se reemplazan por una del ancho exacto del papel.
export function ajustarSeparadores(texto, size) {
  const cols = columnasPorTamano(size);
  return texto
    .split('\n')
    .map((linea) => (/^-{24}$/.test(linea.trim()) ? '-'.repeat(cols) : linea))
    .join('\n');
}

// dd/mm/aaaa hh:mm:ss en hora de Bogotá (UTC-5, sin horario de verano).
export function fechaHoraBogota(fecha = new Date()) {
  const d = new Date(fecha.getTime() - 5 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

// ¿El pedido está vacío o solo trae la plantilla (separadores + bloque de cobro sin valores)?
// Reconoce el bloque actual y los anteriores (con o sin espacio después del "$").
const PLANTILLA_COBRO = /Total:\s*\$\s*domicilio:\s*\$\s*(?:A cobrar:|Total a pagar el\s+cliente:)\s*\$/g;

export function esPedidoVacio(texto) {
  const resto = limpiarTexto(texto)
    .replace(PLANTILLA_COBRO, '')
    .replace(/-{24}/g, '')
    .replace(/\s+/g, '');
  return resto.length === 0;
}
