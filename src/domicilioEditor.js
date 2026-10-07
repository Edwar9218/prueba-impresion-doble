// domicilioEditor.js
// Lógica del "Enter inteligente" portada desde Domi-POS (templates/plantillas/pos.html).
// Son funciones puras (sin React ni pantalla), así se pueden probar por separado.

export const SEPARADOR = '\n------------------------\n';
// Cada línea termina en "$ " (con espacio) para que el precio no quede pegado al signo.
// Última línea corta ('A cobrar:$') para que quepa en un renglón con letra grande.
export const BLOQUE_COBRO = 'Total:$ \ndomicilio:$ \nA cobrar:$ ';

// Zona de cobro: desde el primer "Total:" hasta el final del texto.
// Reconoce el bloque nuevo y también el anterior ('Total a pagar el / cliente:$') de borradores e historial viejos.
const PATRON_BLOQUE = /Total:.*\n.*domicilio:.*\n.*(?:A cobrar:|Total a pagar el\ncliente).*$/s;

/**
 * ¿La posición está dentro de la zona de cobro (Total / domicilio / A cobrar)?
 * Sirve para que Enter solo haga salto de línea normal fuera de esa zona.
 */
export function enZonaCobro(texto, pos) {
  const match = texto.match(PATRON_BLOQUE);
  if (!match) return false;
  const inicio = texto.indexOf(match[0]);
  return pos >= inicio && pos <= inicio + match[0].length;
}

/**
 * Decide qué hace Enter con el texto actual.
 * @param {string} texto      Texto ANTES de presionar Enter
 * @param {number} inicioSel  Inicio del cursor / selección
 * @param {number} finSel     Fin de la selección (igual a inicioSel si no hay)
 * @returns {{texto: string, cursor: number} | null}
 *          null = Enter normal (deja el salto de línea que ya escribió el teclado)
 */
export function aplicarEnter(texto, inicioSel, finSel = inicioSel) {
  const match = texto.match(PATRON_BLOQUE);

  if (match) {
    const inicioBloque = texto.indexOf(match[0]);
    const finBloque = inicioBloque + match[0].length;

    // Cursor dentro de la zona de cobro (Total / domicilio / A cobrar)
    if (inicioSel >= inicioBloque && inicioSel <= finBloque) {
      const lineas = match[0].split('\n');
      let inicioLinea = inicioBloque;
      for (let i = 0; i < lineas.length; i++) {
        const finLinea = inicioLinea + lineas[i].length;
        const esUltima = i === lineas.length - 1;

        if (inicioSel === finSel && inicioSel === finLinea) {
          // Al final de una línea del bloque que NO es la última: pasar al final de la siguiente
          // (el texto no cambia; el salto de línea que escribió el teclado se descarta).
          if (!esUltima) {
            // Si el siguiente renglón es el cierre del bloque (línea de guiones), el cursor pasa hasta debajo de él.
            let k = i + 1;
            if (/^-{24}$/.test(lineas[k].trim()) && k + 1 < lineas.length) k++;
            let finSiguiente = finLinea;
            for (let j = i + 1; j <= k; j++) finSiguiente += 1 + lineas[j].length;
            return { texto, cursor: finSiguiente };
          }
          // Al final de la última línea (más de 7 caracteres): nuevo separador
          if (lineas[i].trim().length > 'cliente'.length) {
            return {
              texto: texto.slice(0, inicioSel) + SEPARADOR + texto.slice(inicioSel),
              cursor: inicioSel + SEPARADOR.length,
            };
          }
        }
        inicioLinea = finLinea + 1;
      }
      return null; // en cualquier otro punto de la zona: Enter normal
    }
  }

  // Fuera de la zona de cobro (o todavía no existe): separador, y el bloque
  // de cobro se agrega al final solo si aún no estaba.
  const antes = texto.slice(0, inicioSel);
  const despues = texto.slice(finSel);
  let cursor = antes.length + SEPARADOR.length;
  // Si se acaba de crear el bloque de cobro y el Enter fue al final del pedido, el cursor pasa
  // directo al final de "Total:$ " para escribir el precio sin tener que tocar la pantalla.
  if (!match && despues === '') cursor += BLOQUE_COBRO.split('\n')[0].length;
  return {
    texto: antes + SEPARADOR + despues + (match ? '' : BLOQUE_COBRO + SEPARADOR), // el bloque nace con su cierre
    cursor,
  };
}

/**
 * React Native no permite cancelar la tecla Enter, así que se detecta DESPUÉS
 * de que el teclado ya escribió el salto de línea en onChangeText.
 * @param {string} anterior  Texto antes del cambio
 * @param {string} nuevo     Texto después del cambio
 * @param {{start:number,end:number}} [sel]  Última selección conocida (onSelectionChange)
 * @returns {{inicio:number, fin:number} | null}  null si el cambio no fue un Enter
 */
export function detectarEnter(anterior, nuevo, sel) {
  if (sel && nuevo === anterior.slice(0, sel.start) + '\n' + anterior.slice(sel.end)) {
    return { inicio: sel.start, fin: sel.end };
  }
  // Respaldo: comparar prefijo y sufijo comunes.
  let p = 0;
  const max = Math.min(anterior.length, nuevo.length);
  while (p < max && anterior[p] === nuevo[p]) p++;
  let s = 0;
  while (s < max - p && anterior[anterior.length - 1 - s] === nuevo[nuevo.length - 1 - s]) s++;
  if (nuevo.slice(p, nuevo.length - s) !== '\n') return null;
  return { inicio: p, fin: anterior.length - s };
}


// ---------------------------------------------------------------------------
// Precio en pesos colombianos (COP): el "$" es la referencia.
// Lo que se escribe pegado después del "$" (con un espacio opcional) se muestra con puntos
// de miles: 5000 -> 5.000.  El formato se detiene solo si el usuario deja un espacio o salta
// de renglón después del número, y solo se aplica si lo escrito son números.
// ---------------------------------------------------------------------------
const esDigito = (c) => c >= '0' && c <= '9';
const esNumeroOPunto = (c) => esDigito(c) || c === '.';

const MAX_DIGITOS_PRECIO = 9;

export const formatoCOP = (digitos) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Número que está pegado al cursor y tiene un "$" como referencia. null si no aplica.
function buscarPrecio(texto, cursor) {
  let ini = cursor;
  while (ini > 0 && esNumeroOPunto(texto[ini - 1])) ini--;
  let fin = cursor;
  while (fin < texto.length && esNumeroOPunto(texto[fin])) fin++;
  if (ini === fin) return null; // no hay número junto al cursor

  // Los puntos del final NO son parte del número (por ejemplo el punto que pone el teclado al dar
  // doble espacio después de un precio): se respetan tal cual y no se vuelven a tocar.
  while (fin > ini && texto[fin - 1] === '.') fin--;
  if (fin === ini || cursor > fin) return null;

  let posDolar = ini - 1;
  if (texto[posDolar] === ' ') posDolar--; // un solo espacio después del "$" es normal
  if (posDolar < 0 || texto[posDolar] !== '$') return null; // dos espacios o sin "$": no es precio

  const siguiente = texto[fin];
  if (siguiente && /[A-Za-zÀ-ÿ]/.test(siguiente)) return null; // "5000abc" no es un número
  return { ini, fin, posDolar };
}

/**
 * Dónde queda el cursor después de que el teclado cambió el texto.
 * sel = última selección conocida (antes del cambio).
 */
export function cursorTrasCambio(anterior, nuevo, sel) {
  if (sel) {
    const ini = Math.min(sel.start, sel.end);
    const fin = Math.max(sel.start, sel.end);
    const largoIns = nuevo.length - (anterior.length - (fin - ini));
    if (
      largoIns >= 0 &&
      nuevo.slice(0, ini) === anterior.slice(0, ini) &&
      nuevo.slice(ini + largoIns) === anterior.slice(fin)
    ) {
      return ini + largoIns; // escribió o reemplazó
    }
    if (ini === fin && ini > 0 && nuevo === anterior.slice(0, ini - 1) + anterior.slice(ini)) {
      return ini - 1; // retroceso
    }
  }
  let p = 0;
  const max = Math.min(anterior.length, nuevo.length);
  while (p < max && anterior[p] === nuevo[p]) p++;
  let s = 0;
  while (s < max - p && anterior[anterior.length - 1 - s] === nuevo[nuevo.length - 1 - s]) s++;
  return nuevo.length - s;
}

/**
 * Da formato COP al número que está junto al cursor.
 * @returns {{texto: string, cursor: number} | null}  null si no hay nada que cambiar
 */
export function formatearPrecioEnCursor(texto, cursor) {
  const t = buscarPrecio(texto, cursor);
  if (!t) return null;
  let digitos = texto.slice(t.ini, t.fin).replace(/\./g, '');
  if (!digitos) return null;

  const izq = texto.slice(t.ini, cursor).replace(/\./g, '').length; // dígitos a la izquierda del cursor
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  let izqNuevo = Math.max(0, izq - (digitos.length - sinCeros.length));
  digitos = sinCeros.slice(0, MAX_DIGITOS_PRECIO); // un precio real nunca pasa de 999.999.999
  izqNuevo = Math.min(izqNuevo, digitos.length);

  const formateado = formatoCOP(digitos);
  const nuevoTexto = texto.slice(0, t.posDolar + 1) + ' ' + formateado + texto.slice(t.fin);
  if (nuevoTexto === texto) return null;

  let cuenta = 0;
  let idx = 0;
  while (idx < formateado.length && cuenta < izqNuevo) {
    if (formateado[idx] !== '.') cuenta++;
    idx++;
  }
  return { texto: nuevoTexto, cursor: t.posDolar + 2 + idx };
}

/**
 * Se llama en cada cambio del texto (que no sea el Enter inteligente).
 * Si el cambio fue dentro de un precio, devuelve el texto con los puntos de miles.
 * Además, al escribir un "$" agrega un espacio y deja el cursor delante de él.
 * @returns {{texto: string, cursor: number} | null}  null = dejar el texto como lo escribió el usuario
 */
export function procesarPrecio(anterior, nuevo, sel) {
  let texto = nuevo;
  let cursor = cursorTrasCambio(anterior, nuevo, sel);

  // Retroceso sobre un punto de miles (entre dígitos): se borra también el dígito anterior (si no, el punto reaparece).
  if (anterior.length - nuevo.length === 1) {
    const idx = cursor;
    if (
      anterior[idx] === '.' &&
      esDigito(anterior[idx + 1]) && // solo un punto de miles (entre dígitos); el punto final se borra solo
      nuevo === anterior.slice(0, idx) + anterior.slice(idx + 1) &&
      buscarPrecio(anterior, idx) &&
      idx > 0 &&
      esDigito(anterior[idx - 1])
    ) {
      texto = anterior.slice(0, idx - 1) + anterior.slice(idx + 1);
      cursor = idx - 1;
    }
  }

  // Al escribir "$" se agrega un espacio y el cursor queda adelante, no atrás.
  // Solo al insertar (no al borrar), para que el retroceso no vuelva a crear el espacio.
  if (
    nuevo.length > anterior.length &&
    cursor > 0 &&
    texto[cursor - 1] === '$' &&
    texto[cursor] !== ' '
  ) {
    texto = texto.slice(0, cursor) + ' ' + texto.slice(cursor);
    cursor += 1;
  }

  const r = formatearPrecioEnCursor(texto, cursor);
  if (r) return r;
  return texto !== nuevo ? { texto, cursor } : null;
}

/**
 * ¿El cursor está escribiendo un precio? Es decir, justo después de "$" (con un espacio opcional)
 * y de los dígitos escritos hasta ahora. Un espacio después del número, o cualquier letra, lo desactiva.
 */
export function enZonaPrecio(texto, cursor) {
  if (cursor == null || cursor < 0) return false;
  return /\$ ?[\d.]*$/.test(texto.slice(0, cursor));
}
