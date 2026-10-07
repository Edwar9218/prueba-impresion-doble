// ticketBuilder.js - arma los bytes ESC/POS de los tickets Texto y Domicilio.
import EscPosEncoder from 'esc-pos-encoder';
import { ajustarSeparadores, fechaHoraBogota, limpiarTexto, presetDeTamano } from './ticketText';

// GS ! n : agranda ancho y alto (1 a 8 veces).   ESC SP n : puntos extra entre letras.
const espacio = (n) => [0x1b, 0x20, n];
const gsSize = (w, h) => [0x1d, 0x21, ((w - 1) << 4) | (h - 1)];

// Última barrera antes de la impresora: la PT-210 dibuja una raya negra con cualquier carácter que no sea
// ASCII (tildes, ñ, emojis...). Aunque el texto ya viene limpio de ticketText.limpiarTexto, aquí se
// asegura una vez más que a cada renglón solo le queden caracteres ASCII (á -> a, ñ -> n; lo demás se quita).
function soloAscii(linea) {
  let t = String(linea);
  try {
    t = t.normalize('NFD'); // separa la letra de su tilde
  } catch (e) {
    // si el motor no tiene normalize, se sigue con el texto tal cual
  }
  return t.replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '');
}

function armar(lineas, size, fecha) {
  const p = presetDeTamano(size);
  const enc = new EscPosEncoder();
  enc
    .initialize()
    .codepage('cp858')
    .align('left')
    .raw(gsSize(p.w, p.h))
    .raw(espacio(p.spacing || 0));
  lineas.forEach((l) => enc.line(soloAscii(l)));
  if (fecha) enc.raw(espacio(0)).raw(gsSize(1, 1)).line(soloAscii(fecha)); // fecha en letra normal para que no se parta
  enc
    .raw(espacio(0)) // restaura espaciado y tamaño normales
    .raw(gsSize(1, 1))
    .raw([0x1b, 0x21, 0x00])
    .newline(3); // avanza papel (la PT-210 no corta)
  return enc.encode();
}

const sinFinales = (t) => t.replace(/\s+$/, '');

export function buildTicketTexto(texto, size) {
  const limpio = sinFinales(limpiarTexto(texto));
  return armar(limpio.split('\n'), size, null);
}

// Si el pedido trae el bloque de cobro (Total / domicilio / A cobrar), el ticket siempre lo cierra con una
// línea de guiones justo debajo de "A cobrar", aunque no se haya escrito en pantalla. Si ya hay una línea de
// guiones debajo (con o sin renglones en blanco en medio), no se repite. Reconoce también el bloque antiguo.
const BLOQUE_COBRO_RE = /Total:[^\n]*\n[^\n]*domicilio:[^\n]*\n[^\n]*(?:A cobrar:|Total a pagar el\n[^\n]*cliente:)[^\n]*/;

function cerrarBloqueCobro(texto) {
  const m = BLOQUE_COBRO_RE.exec(texto);
  if (!m) return texto;
  const fin = m.index + m[0].length;
  const resto = texto.slice(fin);
  const siguiente = resto.split('\n').map((l) => l.trim()).find((l, i) => i > 0 && l !== '');
  if (siguiente && /^-{3,}$/.test(siguiente)) return texto; // ya está cerrado
  const despues = resto.replace(/^\s+/, ''); // lo que sigue, sin renglones en blanco al inicio
  return texto.slice(0, fin) + '\n' + '-'.repeat(24) + (despues ? '\n' + despues : '');
}

export function buildTicketDomicilio(texto, size) {
  const limpio = ajustarSeparadores(cerrarBloqueCobro(sinFinales(limpiarTexto(texto))), size);
  return armar(limpio.split('\n'), size, fechaHoraBogota());
}

export function buildTicket(tipo, texto, size) {
  return tipo === 'Domicilio' ? buildTicketDomicilio(texto, size) : buildTicketTexto(texto, size);
}
