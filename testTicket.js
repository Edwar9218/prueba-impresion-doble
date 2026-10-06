// testTicket.js
// Ticket de prueba MÍNIMO (ahorra papel): "HOLA" + celular y hora.
import EscPosEncoder from 'esc-pos-encoder';

const two = (n) => String(n).padStart(2, '0');

/**
 * @param {object} opts
 * @param {string} opts.label       Identificador del celular (ej. "Celular A")
 * @param {number} opts.extraLines  Líneas extra opcionales (por defecto 0)
 * @returns {Uint8Array} bytes ESC/POS
 */
export function buildTestTicket({ label = 'Celular', extraLines = 0 } = {}) {
  const d = new Date();
  const hora = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;

  const enc = new EscPosEncoder();
  enc
    .initialize()
    .codepage('cp858')
    .align('center')
    .bold(true)
    .line('HOLA')
    .bold(false)
    .line(`${label} ${hora}`); // quita esta línea si quieres solo "HOLA"

  for (let i = 1; i <= extraLines; i++) {
    enc.line(`Linea ${String(i).padStart(2, '0')}`);
  }

  enc.newline(3); // avance mínimo de papel para poder arrancar el ticket

  return enc.encode();
}
