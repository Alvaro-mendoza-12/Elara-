# Diseño de Elara 0.7

La identidad combina papel frío, violeta y tipografía Plus Jakarta Sans, con JetBrains Mono para código. El símbolo original tiene tres pliegues blancos rotados sobre un campo violeta; se comparte entre cabecera, carga, mensajes, favicon e iconos de instalación. La animación se aplica al símbolo completo para conservar la posición de los tres pliegues.

El usuario puede elegir claro, oscuro o dispositivo y activar mayor contraste. Las preferencias se guardan de inmediato en el navegador y se aplican antes de hidratar la interfaz. Los colores del chat, código, paneles y avisos proceden de tokens comunes. El script check-contrast.mjs verifica 124 parejas de texto, superficies, controles y código; no certifica por sí solo toda la accesibilidad del producto.

El editor usa una sola línea en espacios amplios: adjunto, texto, motor, micrófono y envío. En espacios estrechos, separa el texto y las acciones en dos filas. Mantiene un único borde de foco, estados de grabación y transcripción y errores visibles que pueden cerrarse. El selector muestra solo opciones implementadas, disponibilidad real y el nombre del modelo base; la extensión es una preferencia de la respuesta, no una representación del razonamiento interno.

El visor se puede redimensionar con ratón o teclado. Muestra carcasa de laptop, tablet o celular, pero escala la carcasa completa en lugar de alterar el viewport del HTML. Incluye recarga, giro, ajuste, tamaño real y restablecimiento. Los catálogos móviles usan tarjetas en una columna con icono y descripción, márgenes propios y etiquetas sin superposición.

Los avatares de Novvin muestran imágenes, GIF y video. Respetan la preferencia de movimiento reducido, mostrando un fotograma posterior al inicio para evitar una portada negra; la opción Videos de perfil permite activarlos o pausarlos expresamente. Los videos son silenciosos y reinician como máximo a los doce segundos.
