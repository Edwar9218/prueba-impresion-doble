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

// Filtro del repo: se descarta lo que la impresora no puede imprimir (cp858).
// Se conservan tildes, ñ y algunos símbolos comunes.
const EXTRA_PERMITIDOS = 'áéíóúÁÉÍÓÚñÑüÜ¿¡°ªº€çÇ£¢¥½¼«»';

export function limpiarTexto(texto) {
  return String(texto == null ? '' : texto)
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .split('')
    .filter((ch) => ch === '\n' || (ch >= ' ' && ch <= '~') || EXTRA_PERMITIDOS.includes(ch))
    .join('');
}

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
  const resto = String(texto == null ? '' : texto)
    .replace(PLANTILLA_COBRO, '')
    .replace(/-{24}/g, '')
    .replace(/\s+/g, '');
  return resto.length === 0;
}
