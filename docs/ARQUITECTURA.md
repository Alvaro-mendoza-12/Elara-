# Arquitectura de Elara 0.7

```text
Navegador
  ├─ Sesión verificada antes de abrir el historial correspondiente
  ├─ Historial local por cuenta / invitado; exportación Markdown
  ├─ Micrófono → grabación breve → /api/transcribe → texto revisable
  └─ Visor HTML sandbox allow-scripts sin acceso al origen de Elara

Vercel / Next.js
  ├─ Validación de Origin, esquema, tamaño y roles user/assistant
  ├─ Apoyo ante riesgo personal detectado, independiente del modelo y de Novvin
  ├─ Core 0.7 → utilidades, integrales polinómicas acotadas, plantillas y clasificador
  ├─ /api/models → disponibilidad real del runtime propio
  ├─ /api/chat → Core o conversación según la elección y la petición
  ├─ /api/transcribe → audio acotado y cuenta Novvin verificada
  └─ BFF de Novvin → login, refresh, avatar protegido y revocación

Ubuntu
  ├─ Servicios Novvin existentes, conservados
  └─ Red Docker elara-runtime
       ├─ Gateway autenticado, una inferencia activa, límites y reserva de recursos
       ├─ llama.cpp + Qwen3.5-2B Q4_K_M
       └─ whisper.cpp + Whisper base multilingüe
```

El BFF cifra la credencial de renovación de Novvin mediante AES-256-GCM. La cookie es HttpOnly, SameSite=Lax y Secure en producción. No conserva contraseña ni perfil; cada verificación consulta a Novvin. Las mutaciones validan Origin y Host. La integración usa el contrato web existente de Novvin, no OAuth ni SSO entre dominios.

El perfil se enriquece con los campos públicos autorizados de Novvin, incluyendo `avatar_media_type`. El avatar solo se obtiene desde el bucket avatars del gateway propio, con sesión verificada y comprobación del propietario. Admite imágenes y videos, peticiones Range, límite de 25 MB y cache privado sin almacenamiento. No se reenvían credenciales a hosts arbitrarios.

La aplicación espera la identidad verificada antes de cargar conversaciones. Un cambio de cuenta remonta el espacio de trabajo con otra clave de almacenamiento; no hereda mensajes de otra cuenta ni del invitado. El historial antiguo sin identidad comprobable no se asigna automáticamente. El almacenamiento local no es una base de datos compartida ni ofrece cifrado de historial o sincronización entre dispositivos.

Chat admite un cuerpo de hasta 1 MB, partes de texto de hasta 50.000 caracteres y una selección de los últimos 40 mensajes / 100.000 caracteres. Rechaza roles system del cliente y elimina el metadato step-start del SDK. Si una respuesta anterior no cabe, puede omitirla para conservar mensajes pequeños anteriores; nunca omite la petición más reciente para responder otra distinta.

Conversación selecciona hasta 16 turnos recientes más un resumen acotado de datos explícitos del usuario, con un máximo total de 7.500 caracteres y último mensaje de hasta 6.000 caracteres. El resumen se deriva en cada solicitud: nombre, proyecto, oferta, público o preferencia de respuesta, cuando hay una formulación reconocida. Solo utiliza mensajes del usuario, excluye bloques adjuntos de código y permite correcciones posteriores. No se almacena por separado ni se comparte entre chats; tampoco puede recuperar hechos que ya salieron de la selección de 40 mensajes.

Los bloques HTML se reducen a una referencia y su configuración de presentación validada. Para reformular una respuesta, el modelo recibe el texto anterior con la petición concreta y se excluyen temas antiguos que no ayudan a esa edición. Las respuestas cortas de confirmación no consumen turnos de entrada al modelo. Un inicio de tema explícito reinicia el contexto sin borrar el historial. La detección de riesgo se ejecuta antes de ese recorte.

Core recuerda nombres explícitos y resuelve preguntas directas sobre el nombre del proyecto, o pide el dato cuando no está disponible. Una explicación actual pasa a ser el referente de «hazlo más claro»; la web anterior se retoma mediante una referencia explícita. Las instrucciones del modelo establecen límites de conocimiento y evitan afirmaciones de acciones no ejecutadas. Consultas detectadas de datos actuales o privados sin fuente reciben una aclaración de capacidad.

Core conserva marca, tema, moneda, color, cantidad y tema del catálogo al editarlo, mediante una especificación mínima embebida en el HTML. No incorpora el chat completo al archivo exportado. El clasificador pequeño se entrena con ejemplos propios al inicializarse; el LLM Qwen se utiliza con sus pesos abiertos cuantizados, sin entrenamiento adicional de pesos.

Las preguntas de capacidad y práctica de integrales se reconocen antes de buscar un prototipo anterior. Las herramientas matemáticas públicas responden antes de consultar a Novvin. El calculador acotado resuelve polinomios en x y puede mostrar el desarrollo por términos; no se remiten expresiones no verificables al LLM como si fueran cálculos exactos.

Las consultas habituales al modelo usan un presupuesto de contexto de 3.600 caracteres; las entradas largas mantienen los límites generales mayores descritos arriba. La solicitud de chat tiene un plazo global de 40 segundos, la generación 35, la primera salida 22 y el intervalo entre fragmentos 10. La comprobación de Novvin para esa consulta se limita a siete segundos. El cliente limita a 45 segundos tanto las cabeceras como la lectura completa del stream. No hay reintentos automáticos de generación. Los abort del servidor debidos a vencimiento se traducen a un error legible; una cancelación del usuario conserva su semántica de detener.

El cliente marca respuestas con error, desconexión, cancelación o finalización por límite mediante metadata elaraIncomplete. El parser del servidor descarta esas respuestas del contexto, aunque conserva las preguntas del usuario. El visor y la exportación respetan ese estado. No se eliminan mensajes históricos para intentar adivinar qué respuestas antiguas pudieron fallar.

La inferencia requiere cuenta Novvin verificada. El identificador enviado al runtime es un HMAC del ID de cuenta, no el correo. El gateway permite solo las rutas previstas y un modelo fijo, protege su clave mediante comparación constante, admite una inferencia a la vez y limita la frecuencia por cuenta. No expone administración, carga de modelos ni el servidor Whisper directamente. El runtime rechaza trabajo si hay menos de 2,5 GiB de memoria disponible o carga media de un minuto de 6 o superior. Límites y reproducibilidad: deployment/README.md.

Dictado graba hasta treinta segundos, libera las pistas del micrófono al detener o cancelar, acota el archivo a 2 MB y no envía el mensaje automáticamente. El audio se procesa en el servidor propio; los archivos temporales de Whisper están en tmpfs y se retiran al terminar. No se habilitaron logs de contenido en el contenedor de voz. El navegador debe conceder acceso al micrófono y soportar MediaRecorder.

El visor valida el origen de postMessage, mantiene un viewport real del dispositivo dentro de una carcasa escalada y conserva el aislamiento sandbox. Los catálogos generan sus iconos SVG con createElementNS y los textos con textContent. El código editado o abierto en otra pestaña debe revisarse antes de utilizar datos reales o publicarlo.
