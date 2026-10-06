// ticketBuilder.js - arma los bytes ESC/POS de los tickets Texto y Domicilio.
import EscPosEncoder from 'esc-pos-encoder';
import { ajustarSeparadores, fechaHoraBogota, limpiarTexto, presetDeTamano } from './ticketText';

// GS ! n : agranda ancho y alto (1 a 8 veces).   ESC SP n : puntos extra entre letras.
const espacio = (n) => [0x1b, 0x20, n];
const gsSize = (w, h) => [0x1d, 0x21, ((w - 1) << 4) | (h - 1)];

function armar(lineas, size, fecha) {
  const p = presetDeTamano(size);
  const enc = new EscPosEncoder();
  enc
    .initialize()
    .codepage('cp858')
    .align('left')
    .raw(gsSize(p.w, p.h))
    .raw(espacio(p.spacing || 0));
  lineas.forEach((l) => enc.line(l));
  if (fecha) enc.raw(espacio(0)).raw(gsSize(1, 1)).line(fecha); // fecha en letra normal para que no se parta
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

export function buildTicketDomicilio(texto, size) {
  const limpio = ajustarSeparadores(sinFinales(limpiarTexto(texto)), size);
  return armar(limpio.split('\n'), size, fechaHoraBogota());
}

export function buildTicket(tipo, texto, size) {
  return tipo === 'Domicilio' ? buildTicketDomicilio(texto, size) : buildTicketTexto(texto, size);
}
