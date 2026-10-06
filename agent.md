# agent.md — DomiPrint

Guía para cualquier agente de IA (o persona) que continúe este proyecto. Léela completa antes de tocar código.
Actualizada: 05/10/2026 (Texto simplificado, arreglo del borrado del punto final, evaluación del teclado numérico).

## 1. Qué es
App Android (Expo / React Native, JavaScript) que imprime por **Bluetooth Classic** en la impresora térmica **PT-210** (58 mm, ESC/POS) la información de un pedido para el mensajero. Pensada para ser **rápida**: abrir, escribir o pegar, imprimir.
Dos teléfonos/tablets comparten una impresora, por eso **cada impresión conecta, imprime y se desconecta** (la impresora queda libre).

Nace del PoC `prueba-impresion-doble` y de la lógica de Domi-POS (web): Pegar, Enter inteligente con bloque de cobro, validación, borrador.

## 2. Stack y reglas de entorno
- Expo **SDK 54**, React Native 0.81.5, React 19.1.0. `newArchEnabled: false` (obligatorio: `react-native-bluetooth-classic` es un módulo antiguo).
- **No funciona en Expo Go** (módulo nativo). Se usa **Development Build** (`expo-dev-client`) y, para uso diario sin PC, un APK `preview` de EAS.
- Librerías: `react-native-bluetooth-classic`, `esc-pos-encoder` (v3, marcada deprecada pero funciona), `buffer`, `@react-native-async-storage/async-storage`, `expo-clipboard` (se instala con `npx expo install expo-clipboard`; es nativo).
- Paquete Android: `com.edwar.domiprint`. Slug: `domiprint`. Sin base de datos propia: todo en AsyncStorage.
- El usuario trabaja en **Windows**. Dar comandos de CMD exactos, un paso a la vez.

### Qué requiere un APK nuevo y qué no
- **Solo JavaScript** (todo lo de `src/` y `App.js`): NO requiere build. Con `npx expo start --dev-client` se recarga.
- **Requiere build** (`eas build`): cambios en `app.json` (icono, splash, permisos, paquete), agregar/quitar librerías nativas (ej. `expo-clipboard`).
- Comandos: dev `eas build --profile development --platform android`; independiente `eas build --profile preview --platform android`.

## 3. Estructura
```
App.js                        3 pestañas (Categorías, Historial, Plantillas) + menú ⋮ -> Configuraciones
src/PrinterContext.js         impresora por defecto, tamaño, estado y flujo completo de impresión
src/BluetoothPrinterService.js printOnDemand, ensureDisconnected, probeConnection, isBluetoothEnabled
src/ticketBuilder.js          bytes ESC/POS de los tickets (Texto y Domicilio)
src/ticketText.js             tabla de tamaños, filtro de caracteres, separadores, fecha Bogotá, esPedidoVacio
src/domicilioEditor.js        Enter inteligente + precio COP (funciones PURAS, probadas con Node)
src/campo.js                  portapapeles (carga opcional) e inserción en cursor
src/storage.js                AsyncStorage (impresora, tamaño, borradores, historial)
src/useBorrador.js            borrador automático de Texto y Domicilio
src/ajustes.js                interruptores: SIN_SUGERENCIAS y TECLADO_NUMERICO_EN_PRECIO (diagnóstico del teclado)
src/theme.js                  paleta del logo
src/components/               Boton, CampoPapel, ContenedorTeclado, ConectarImpresora
src/screens/                  Categorias, Texto, Domicilio, Historial, Plantillas, Configuracion, TamanoLetra
assets/                       icon.png, adaptive-icon.png, splash.png (logo; fondo #05143F)
```

## 4. Flujo de impresión (no cambiar sin hablar con el usuario)
1. `imprimir()` en `PrinterContext`: exige impresora guardada y Bluetooth encendido.
2. `printOnDemand`: conectar → enviar → pausa (400 ms + 150 ms por KB) → **desconectar siempre en `finally`**.
3. **Un solo intento** de conexión al imprimir (`maxAttempts: 1`). La pantalla de conectar (`probeConnection`) conserva 3 intentos.
4. Se llama a `ensureDisconnected` como red de seguridad.
5. **El sistema no supone que imprimió**: pregunta "¿Salió el ticket?". "No salió" → ofrece imprimir de nuevo. Si el envío falla, ofrece intentarlo de nuevo.
6. La pantalla y el borrador se limpian **solo** cuando el usuario confirma "Sí, salió". Se registra en el Historial al enviar.
7. **Mensajes al usuario sin lenguaje técnico** (nada de "socket", "timeout", códigos). Texto base: revisar que la impresora esté encendida, no esté conectada a otro celular o dispositivo y esté cerca.
8. La impresora elegida **queda como predeterminada al tocarla** (aunque la prueba de conexión falle) y solo cambia con "Cambiar impresora".

## 5. Tamaños de letra (`TAMANOS` en `ticketText.js`)
| N | Descripción | GS ! (w×h) | Caracteres por renglón |
|---|---|---|---|
| 1 | Normal | 1×1 | 32 |
| 2 | Normal, alta | 1×2 (+3 puntos entre letras, ESC SP 3) | ≈25 |
| 3 | Ancha | 2×1 | 16 |
| **4** | **Doble (por defecto)** | 2×2 | 16 |
| 5 | Triple | 3×3 | 10 |
| 6 | Cuádruple | 4×4 | 8 |

- La **fuente B NO funciona en la PT-210** (no imprime nada): no usarla. No se envía `ESC M`.
- La impresora solo agranda en múltiplos enteros; no hay medidas intermedias (la alternativa sería imprimir texto como imagen: no implementado).
- El tamaño se guarda con la clave `@domiprint/size_v3`. La fecha del ticket de Domicilio sale siempre en tamaño normal.
- Códigos ESC/POS usados: `ESC @` (initialize), `GS ! n`, `ESC SP n`, `ESC ! 0`, codepage `cp858`; no se corta papel (se avanzan 3 líneas).

## 6. Domicilio: bloque de cobro y Enter inteligente (`domicilioEditor.js`)
Bloque: `Total:$ ` / `domicilio:$ ` / `A cobrar:$ ` (cada línea con espacio después del `$`). "A cobrar" es corto para caber en un renglón con letra grande. Se siguen reconociendo bloques viejos (`Total a pagar el / cliente:$`) y sin espacio.
- Enter **fuera del bloque**: inserta un separador de 24 guiones y, si no existe, agrega el bloque al final. Si el Enter fue al final del pedido, el cursor queda al final de `Total:$ `.
- Enter **dentro del bloque**, al final de una línea que no es la última: salta al **final de la siguiente línea** (sin línea en blanco). Al final de `A cobrar:$ `: nuevo separador. En medio de una línea o con selección: Enter normal.
- En el ticket, las líneas de 24 guiones se reemplazan por una del ancho del tamaño elegido.
- Validación: no imprime si el pedido está vacío o solo trae la plantilla.
- Aviso: con 16 columnas, `domicilio:$ 4.000` mide 17 y se parte en dos renglones.

## 7. Precio en pesos COP (SOLO en Domicilio)
El **`$` es la referencia**: el número escrito justo después (un espacio opcional) se muestra con puntos de miles (`5000` → `5.000`), hasta 9 dígitos.
- Se desactiva con un espacio o salto de renglón después del número, con dos espacios tras el `$`, o si lo escrito no son solo números.
- Un `$` sin espacio recibe el espacio automáticamente.
- Retroceso sobre un **punto de miles** (entre dígitos) borra también el dígito anterior (si no, el punto reaparece). Un punto **final** (sin dígito después) se borra solo, sin tocar el número.
- **Los puntos al final de un número no son parte del precio y no se tocan** (ej. el punto que pone el teclado con doble espacio).
- No se aplica al pegar texto ni a texto sin `$`.
- **Texto NO tiene esta lógica ni el Enter inteligente**: es el campo original (teclado normal con sugerencias), solo con el tamaño de letra y la vista del papel, para quien no quiera usar el `$` ni el Enter inteligente.

## 8. Teclado Android: lecciones aprendidas (IMPORTANTE)
React Native no permite cancelar una tecla: el teclado escribe primero y la app corrige después. Eso causó varios problemas; no repetirlos:
- **No usar `keyboardType="visible-password"`**: la tecla Enter deja de escribir un salto de línea y el Enter inteligente deja de funcionar.
- El teclado (SwiftKey en la tablet del usuario) "componía" el número (subrayado) y al reescribirlo con puntos volvía a insertar trozos (`50.000.500.000`). Solución actual: `sinSugerencias` en `CampoPapel` (autoCorrect/spellCheck/autoComplete desactivados) controlado por `SIN_SUGERENCIAS` en `src/ajustes.js`. Si algo raro pasa al escribir, probar `false`.
- **No intentar deshacer el "doble espacio = punto" del teclado**: se probó y crea un bucle (la app lo quita, el teclado lo vuelve a poner). La app no toca ese punto; el usuario puede apagarlo en los ajustes del teclado.
- La selección controlada (`selection`) se suelta a los 120 ms para que el cursor no "retroceda".
- Las funciones de `domicilioEditor.js` deben seguir siendo puras y se prueban con Node antes de entregar.
- **Teclado numérico automático al escribir un precio (Domicilio): EXPERIMENTO activo** (`TECLADO_NUMERICO_EN_PRECIO` en `src/ajustes.js`; ponerlo en `false` lo apaga). Cuando el cursor está justo después de `$ ` y de los dígitos (`enZonaPrecio` en `domicilioEditor.js`), `CampoPapel` usa `keyboardType="numeric"`; al salir del precio vuelve a `default`. Riesgos conocidos: en Android el teclado numérico es solo para campos de una línea (el campo multilínea puede verse aplanado mientras está activo), el cambio reinicia el teclado (brinco) y la tecla Enter pasa a ser "Listo". **Ese Enter también es Enter inteligente**: en modo numérico `CampoPapel` usa `submitBehavior="submit"` (con `'newline'` en un campo multilínea React Native NO avisa del Enter) y `DomicilioScreen.enterNumerico` lo atiende desde `onSubmitEditing` y `onKeyPress` (antirrebote de 250 ms; si además llega un salto de línea escrito por el teclado, se ignora para no aplicarlo dos veces) simulando un salto de línea que pasa por la misma lógica del Enter normal (`procesar`). El cambio de modo se retrasa 60 ms, restaura el cursor y ignora eventos de selección durante 400 ms para evitar que el modo vaya y vuelva. Pendiente: que el usuario diga si la transición le gusta; si no, apagar el interruptor.
- Al dar Enter dentro del bloque se ve un "brinco" (el teclado baja la línea y la app la sube): es inherente a la plataforma. Se aceptó dejarlo. Alternativa no implementada: manejar Enter sin que el teclado escriba (arriesgado con SwiftKey).
- `ContenedorTeclado` sube los botones sobre el teclado (en Android edge-to-edge la ventana no se reduce). El espacio solo crece mientras el teclado está abierto. `MARGEN_EXTRA = 44`; subirlo si en la tablet aún quedan tapados.
- `CampoPapel` muestra la **vista del papel**: la letra cambia con el tamaño y cada renglón en pantalla tiene los mismos caracteres que en el papel. Interlineado fijo (1.25).

## 9. Interfaz y navegación
- Pestañas: Categorías (tarjetas **Texto** y **Domicilio**), Historial, Plantillas ("Próximamente"). La barra se oculta dentro de Texto/Domicilio/Configuraciones.
- Menú ⋮ → **Configuraciones** (menú de tarjetas, hoy solo **Tamaño de letra** con ejemplo visual de cada tamaño). Para agregar opciones: nuevo objeto en `OPCIONES` de `ConfiguracionScreen` + pantalla + rama en `App.js`.
- Texto: campo simple (sin `$`, sin Enter inteligente, sin `sinSugerencias`). Domicilio: Enter inteligente + `$`.
- Botones en Texto/Domicilio, de izquierda a derecha: **Borrar** (rojo, pide confirmar; lejos de Imprimir a propósito), **Pegar**, **Imprimir**.
- Historial: agrupado por fecha (máx. 200), con **Editar** (abre Texto/Domicilio con ese mensaje; vuelve al Historial al salir) e **Imprimir**.
- Borrador: Texto y Domicilio conservan lo escrito al salir (claves `@domiprint/draft_texto` / `draft_domicilio`); se borra con Borrar o tras confirmar la impresión.
- Paleta (del logo): navy `#05143F` (encabezado, texto), azul `#017CFD` (botones, selección), azul claro `#0BA2FB`, fondo `#EEF4FF`; verde = confirmar, rojo = borrar/error.
- Datos locales por dispositivo, sin copia de seguridad ni servidor.

## 10. Cómo probar (Windows)
```
npm install
npx expo install expo-clipboard
npx expo start --dev-client      (abrir el APK de desarrollo e ingresar http://IP-DEL-PC:8081)
```
Lógica pura (sin celular): copiar `domicilioEditor.js` y `ticketText.js` a una carpeta con `package.json` `{"type":"module"}` y probar con Node.

## 11. Pendiente / por verificar en hardware
- Tamaños 3, 5 y 6 en la PT-210 (el 1 y el 4 están probados; el 2 con el espaciado nuevo).
- Impresión alternada y simultánea desde 2 dispositivos (con un solo intento, el choque se resuelve con "Intentar de nuevo").
- Botón **Pegar** funcionando en un APK compilado con `expo-clipboard`.
- Generar el APK `preview` (independiente) cuando todo esté estable; el icono y el splash solo se ven con un build nuevo.
- Posible migración de `esc-pos-encoder` a `@point-of-sale/receipt-printer-encoder` si se va a producción.
- Plantillas: sin lógica todavía.
- Decidir con el usuario si se queda el teclado numérico automático en precios (experimento, sección 8).

## 12. Cómo trabajar con el usuario
- Responder en **español**, claro y sin tecnicismos para lo que ve el usuario final.
- Decir con honestidad qué se probó (lógica con Node) y qué solo se confirma en el celular/impresora.
- Entregar siempre el proyecto actualizado en `domiprint.zip`, indicando si hace falta compilar otro APK.
- No agregar comportamientos que el usuario no pidió; si hay una mejora posible, ofrecerla y esperar.
