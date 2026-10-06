# DomiPrint (resumen rápido)

App Expo SDK 54 (RN 0.81.5) para imprimir por Bluetooth Classic en la PT-210 (58 mm, ESC/POS).
Basada en el PoC "prueba-impresion-doble" y en la lógica de Domi-POS. NO funciona en Expo Go.

## Estructura
- App.js: 3 pestañas (Categorías, Historial, Plantillas) + menú ⋮ -> Configuraciones
- src/BluetoothPrinterService.js: printOnDemand (conectar-imprimir-pausa-desconectar en finally), ensureDisconnected, probeConnection, isBluetoothEnabled
- src/PrinterContext.js: impresora por defecto, tamaño (1-8), flujo completo de impresión + "¿Salió el ticket?" + reimprimir
- src/domicilioEditor.js: Enter inteligente (aplicarEnter/detectarEnter, tal cual el Anexo B)
- src/ticketText.js / ticketBuilder.js: tabla de 6 tamaños (el 4 = doble 2x2, 16 columnas, el probado en la PT-210; la fuente B no imprime en la PT-210), filtro de caracteres, separador al ancho, fecha Bogotá, bytes ESC/POS (ESC M + GS ! n)
- src/components/CampoPapel.js: campo que simula el papel (la letra cambia con el tamaño); ContenedorTeclado.js: sube los botones sobre el teclado (MARGEN_EXTRA)
- src/useBorrador.js: borrador automático de Texto y Domicilio
- src/screens/: Categorias, Texto, Domicilio, Historial, Plantillas, Configuracion
- src/components/ConectarImpresora.js: permisos -> Bluetooth -> lista -> conexión de prueba -> guardar -> soltar

## Probar en local (Windows)
1. Descomprimir en D:\proyecto_impre_duo\domiprint y abrir CMD ahí.
2. npm install
3. npx expo install expo-clipboard
4. npx expo start --dev-client
5. En el celular, abrir el APK de desarrollo ya instalado (el del PoC sirve) y usar "Enter URL manually": http://IP-DEL-PC:8081
   - Con ese APK todo funciona, EXCEPTO el botón Pegar (avisa que falta compilar). Mantener pulsado en el campo y Pegar sí funciona.

## Para que Pegar funcione (una sola vez)
eas init            (crea el proyecto domiprint en EAS)
eas build --profile development --platform android
Instalar ese APK (app "DomiPrint", paquete com.edwar.domiprint). Luego el uso diario es: npx expo start --dev-client

## APK independiente (sin PC)
eas build --profile preview --platform android

## Reglas actuales
- Tamaño por defecto: 4 (el doble de siempre). Se guarda en el celular (clave size_v3).
- Impresión: un solo intento; los mensajes al usuario no son técnicos.
- Borrador de Texto y Domicilio: se borra con Borrar o cuando el usuario confirma "Sí, salió".
- Historial: Editar (abre Texto/Domicilio con ese mensaje) e Imprimir.

## Pendiente de probar en el celular
- Tamaños 2, 3, 5 y 6 en la PT-210 (el 1 es la letra normal y el 4 el doble, ya probados).
- Que el ancho del campo coincida con los renglones del papel.
- Enter inteligente con el teclado real (manejo de la selección en Android).
- Los 8 tamaños y los caracteres por renglón en la PT-210.
- Barra de pestañas vs. barra de navegación del sistema (si queda tapada, avisar).
- Impresión alternada/simultánea con 2 celulares.

## Logo
assets/icon.png (icono), assets/adaptive-icon.png (Android, zona segura) y assets/splash.png (pantalla de inicio con "Domiprint"). El fondo navy es #05143F.
El icono es nativo: para verlo en el celular hay que compilar un APK nuevo (eas build) y reinstalar.

## Paleta (src/theme.js)
Navy #05143F (encabezado y textos), azul #017CFD (botones, enlaces, selección), azul claro #0BA2FB, fondo #EEF4FF, tarjetas blancas. Verde = confirmar, rojo = borrar/errores.

## Bloque de cobro
Total:$ / domicilio:$ / A cobrar:$  (cada línea cabe en un renglón con letra doble). Para cambiar el texto de la última línea: BLOQUE_COBRO y PATRON_BLOQUE en src/domicilioEditor.js.

## Tamaño 2 (alta)
Usa ESC SP 3 (3 puntos extra entre letras) para verse menos angosta: ≈25 por renglón. Si se quiere más o menos separación, cambiar `spacing` en TAMANOS (src/ticketText.js) y `cols` = floor(384/(12+spacing)).

## Precio en pesos (COP) en Domicilio
- El bloque de cobro lleva un espacio después de cada "$": "Total:$ " / "domicilio:$ " / "A cobrar:$ ".
- El número que se escribe después del "$" se muestra con puntos de miles (5000 -> 5.000). Se detiene si el usuario deja un espacio o salta de renglón después del número, y solo si lo escrito son números. Solo en Domicilio (la activa el $); Texto es el campo original sin esa lógica. No se aplica al pegar.
- Lógica en src/domicilioEditor.js (procesarPrecio, formatearPrecioEnCursor) y se usa en DomicilioScreen.onChangeText.
- Aviso: con letra de 16 caracteres por renglón (tamaño 4), "domicilio:$ 4.000" mide 17 y se parte en dos renglones.

## Error de puntos de miles (tablet)
Causa: el teclado "componía" el número (se veía subrayado) y al reescribir el texto con puntos volvía a insertar trozos. Arreglo: en Texto y Domicilio el campo usa `sinSugerencias` (sin predicción ni corrección) en CampoPapel. NO usar keyboardType visible-password: rompe la tecla Enter (el Enter inteligente deja de funcionar). Tope de 9 dígitos en el precio. Si volviera a pasar: cambiar el formato a que se aplique al dejar un espacio / salto de renglón.

## Enter inteligente: cursor
Al crear el bloque de cobro (Enter al final del pedido) el cursor queda al final de "Total:$ ", listo para escribir el precio.

## Enter dentro del bloque de cobro
Enter al final de "Total:$" salta al final de "domicilio:$", y de ahí al final de "A cobrar:$" (sin insertar líneas en blanco). Al final de "A cobrar" crea un nuevo separador. Enter en medio de una línea del bloque, o fuera del bloque, funciona como antes.

## Doble espacio = punto (teclado)
El punto lo pone el teclado (SwiftKey/Gboard). Se intentó deshacerlo desde la app y provocaba un bucle: la app lo quitaba y el teclado lo volvía a poner. Se quitó: la app NO toca ese punto. Si no se quiere, apagarlo en los ajustes del teclado.
Los puntos al final de un número (ej. "5.000. ") no se consideran parte del precio y no se tocan.
Si algo raro pasa al escribir (cursor que retrocede), probar SIN_SUGERENCIAS = false en src/ajustes.js.

## Cambios del 05/10/2026
- Borrar el punto final de un precio (el del doble espacio) ya no borra también un dígito.
- Texto: campo original, sin lógica de $ ni teclado sin sugerencias.
- Ver agent.md para el contexto completo del proyecto.
- Experimento: teclado numérico automático al escribir un precio en Domicilio (src/ajustes.js, TECLADO_NUMERICO_EN_PRECIO). Apagar con false si no gusta.
