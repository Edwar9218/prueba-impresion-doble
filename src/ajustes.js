// ajustes.js - interruptores para diagnosticar problemas con el teclado.

// true  = el teclado no predice ni corrige en Texto y Domicilio (necesario para que los puntos de miles
//         no se dupliquen en algunos teclados).
// false = teclado normal. Si algo raro pasa al escribir (cursor que retrocede, espacios), probar con false.
export const SIN_SUGERENCIAS = true;

// EXPERIMENTO (solo Domicilio): cuando el cursor está en un precio (después de "$ " y mientras se escriben
// dígitos) el teclado pasa a numérico, y vuelve al normal al salir del precio (espacio o Enter).
// true  = activado.  false = apagado (teclado normal siempre). Apagarlo si la transición molesta o falla.
export const TECLADO_NUMERICO_EN_PRECIO = true;
