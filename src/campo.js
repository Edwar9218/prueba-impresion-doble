// Utilidades para los campos de texto: portapapeles e inserción en el cursor.

// expo-clipboard es un módulo nativo: si el APK instalado todavía no lo incluye,
// la app sigue funcionando y solo "Pegar" avisa que falta compilar una versión nueva.
let Clipboard = null;
try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  Clipboard = null;
}

export async function leerPortapapeles() {
  if (!Clipboard || !Clipboard.getStringAsync) {
    const err = new Error('Pegar necesita compilar una versión nueva de la app.');
    err.code = 'NO_DISPONIBLE';
    throw err;
  }
  return Clipboard.getStringAsync();
}

// sel: {start,end} o null (null = al final del texto)
export function insertarEnCursor(texto, sel, insertar) {
  const largo = texto.length;
  const s = sel ? Math.min(sel.start, largo) : largo;
  const e = sel ? Math.min(sel.end, largo) : largo;
  const a = Math.min(s, e);
  const b = Math.max(s, e);
  return { texto: texto.slice(0, a) + insertar + texto.slice(b), cursor: a + insertar.length };
}
