# Coherencia y estabilidad de respuestas — 16 de noviembre de 2026

Se corrigieron desvíos de intención, referencias de conversación, correcciones de datos, cantidades, adjuntos y cálculos. La prueba prolongada también descubrió presión de memoria dentro del contenedor del modelo. Se limitó su caché y se mantuvieron CPU, RAM, modelo y concurrencia.

## Alcance y resultados

Se ejecutaron **1200 casos de núcleo, contexto y barrera de datos**: 680 pasaban antes y 1200 después, con el mismo catálogo y evaluador. Son veinte familias con variaciones parametrizadas; no son generaciones del LLM ni 1.200 temas distintos. Desarrollo: 960 casos; validación: 240. La versión actual pasó 99 pruebas unitarias/integración, lint y build.

Se guardaron **167 turnos HTTP reales** durante las iteraciones: 121 fueron derivados por el BFF a Conversación y 110 obtuvieron una respuesta completa de ese motor. Los demás usan Core o registran errores previos a la generación. Las pruebas separadas de acceso y del gateway no se suman a ese total. Los procesos de desarrollo interrumpidos pueden haber tenido solicitudes sin terminar; solo se cuentan las filas guardadas.

| Ronda | Código | HTTP | Motor conversación | Reglas | Correctas | Parciales | Incorrectas | Transporte |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | sin registrar | 36 | 22 | 19 | 8 | 8 | 16 | 4 |
| latency-probe | ba901b5 | 11 | 8 | 8 | 7 | 2 | 0 | 2 |
| prompt-probe | 3b5db8a | 16 | 16 | 15 | 4 | 9 | 2 | 1 |
| memory-probe | 50c040a | 21 | 10 | 13 | 12 | 3 | 0 | 6 |
| final | 24d2807 | 36 | 22 | 32 | 25 | 6 | 4 | 1 |
| validation | 24d2807 | 12 | 10 | 10 | 7 | 2 | 3 | 0 |
| grounding | 24d2807 | 6 | 6 | 5 | 2 | 2 | 2 | 0 |
| repeat | 24d2807 | 6 | 4 | 6 | 5 | 1 | 0 | 0 |
| timeout-baseline | 24d2807 | 4 | 4 | 3 | 0 | 1 | 2 | 1 |
| timeout-fixed | 04ac16a | 4 | 4 | 3 | 0 | 1 | 3 | 0 |
| followup-check | 04ac16a | 15 | 15 | 10 | 5 | 5 | 5 | 0 |

La batería completa corresponde a las rondas final, validation, grounding y repeat: código 24d28076169c972b98dde79b9af146ad57914cc4, misma configuración del runtime, 60 turnos, 39 correctos, 11 parciales, 9 incorrectos y 1 fallos de transporte. No representa todos los cambios posteriores. Los 19 turnos de timeout-fixed y followup-check corresponden a 04ac16a. Los cambios de b8fdc56 y 58778b2 tienen regresiones y comprobaciones dirigidas; no se repitió la batería pública completa. La muestra es dirigida y parte de los cambios se desarrolló observando esas familias. No se modificaron criterios para convertir fallos en aciertos.

Las comprobaciones de palabras clave no demuestran corrección. Se conserva una revisión cualitativa del asistente de programación con motivos y huellas de cada salida; no es evaluación humana independiente. En las primeras rondas hubo explicaciones físicas falsas que pasaban las reglas, JSON no solicitado, traducciones con nombres cambiados y respuestas interrumpidas. Esos fallos están guardados, no eliminados de las cuentas.

## Cambios aplicados

- Pedir ideas, explicaciones o traducciones no debe crear una tienda o revisar el texto como JavaScript. Las negaciones y algunos errores frecuentes de escritura se interpretan antes del generador.
- Las preguntas de seguimiento conservan su referencia. Las correcciones actuales prevalecen; un texto nuevo para un negocio puede usar sus datos corregidos sin arrastrar borradores antiguos. Los nombres y cifras reciben instrucciones explícitas de conservación.
- Los ejercicios polinómicos y sus cantidades/referencias siguen usando cálculo exacto. Se evitan coincidencias aritméticas parciales dentro de una frase.
- Cuatro familias de explicaciones básicas compatibles usan una referencia pública de Core con fuente: fotosíntesis, hielo, flotación y colores del cielo. Ocho temas tienen notas de apoyo; las peticiones abiertas continúan con el LLM. No es una base de conocimiento general.
- Se eliminó una instrucción ambigua que provocaba JSON no pedido y se acortó el texto fijo: modo breve con objetivo de 35 palabras y explicación de 60. La comprobación remota de Novvin tiene diez segundos dentro del plazo global de 42; el cliente conserva 45 segundos. No hay reintentos automáticos de generación.

## Servidor y tiempos

Antes se midieron 2,936 GiB dentro del límite de 3 GiB y 73.853 eventos de límite de memoria, sin OOM. La ayuda del binario confirmó una caché predeterminada de 8.192 MiB y 32 checkpoints. Se configuró **256 MiB y dos checkpoints**, con la misma imagen fijada, los mismos pesos y límites de 2,5 CPU / 3 GiB / una ranura. Se conservaron los servicios y rutas de Novvin. [Parámetros oficiales de llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).

Después se recogieron 15 muestras: uso máximo observado 1161 MiB, pico del cgroup 1164 MiB, límite 3072 MiB, eventos de límite 0, OOM 0 y muertes por OOM 0. Es una observación durante esta batería, no una garantía de disponibilidad indefinida.

Entre las respuestas completas de la ronda final, la mediana de Core fue 488 ms; la de Conversación 15064 ms y su percentil 95 25896 ms. Estas cifras excluyen respuestas fallidas y no se deben leer como latencia garantizada. El control separado del gateway comprobó 401 sin clave, una generación activa, 429 para la segunda petición y voz disponible.

## Límites y reproducción

Qwen3.5-2B sigue teniendo dos mil millones de parámetros. No se entrenaron sus pesos ni se demuestra superioridad frente a otros modelos. Core aporta respuestas verificables en dominios acotados; el modelo todavía puede omitir restricciones, equivocar datos o fallar en preguntas no cubiertas. No navega por internet ni conoce datos privados del negocio. El historial sigue siendo local al navegador y separado por cuenta.

Catálogos y método: [evals/RESPONSE_QUALITY.md](../evals/RESPONSE_QUALITY.md). Resultados: [summary.json](../evals/results/summary.json), [baseline-all.json](../evals/results/baseline-all.json), [final-all.json](../evals/results/final-all.json), conversaciones y revisiones en evals/results y evals/reviews. Las credenciales sintéticas y los logs privados no se incluyen en Git.

Para repetir las comprobaciones rápidas: npm run eval:responses. Para HTTP se necesita un fixture sintético propio, la dirección autorizada y los scripts evaluate-live-dialogues.mjs / review-live-results.mjs. La batería es secuencial, con pausas, sin aumentar cuotas. Las pruebas crean datos reales de QA que deben retirarse de forma exacta al finalizar.

## Hallazgos posteriores y calibración privada

Las traducciones todavía pueden repetir instrucciones o quedarse en español; los resúmenes alteran fechas o personas, algunos JSON son inválidos y los planes ignoran minutos disponibles. Los chistes siguen siendo incoherentes: eliminar el timeout en cuatro casos no corrigió el contenido. Las notas científicas tampoco impiden todas las afirmaciones falsas.

Las tandas públicas llegaron a ocupar la única ranura mientras el propietario usaba la aplicación. Se detuvieron. La calibración posterior usa un contenedor privado que se pausa cuando el servicio público está ocupado; no se dejó carga recurrente. Sus tiempos incluyen pausas y condiciones distintas: no sirven como comparación de latencia de producción.

- Qwen3-4B-Instruct-2507: 3 generaciones guardadas en [native-qwen3-4b-cached.json](../evals/results/native-qwen3-4b-cached.json). Private QA; CPU 2.5, RAM 3 GiB, ctx 4096, cache 256 MiB, checkpoints 2; pauses for live service; wall times not production latency.
- Qwen3-4B-Instruct-2507: 4 generaciones guardadas en [native-qwen3-4b-current.json](../evals/results/native-qwen3-4b-current.json). Private uncached QA; CPU 2.5, RAM 3 GiB, ctx 4096; pauses for live service; not production latency.
- Qwen3-4B-Instruct-2507: 4 generaciones guardadas en [native-qwen3-4b-minimal.json](../evals/results/native-qwen3-4b-minimal.json). Private uncached QA; CPU 1.5, RAM 3 GiB, ctx 4096; pauses for live service; not production latency.
- Qwen3.5-2B: 8 generaciones guardadas en [native-qwen35-2b.json](../evals/results/native-qwen35-2b.json). Private uncached QA; qualitative comparison only; CPU 1.5, RAM 3 GiB, ctx 2048; yields to live chat; not production latency.

Probar un candidato de cuatro mil millones de parámetros no significa publicarlo; la decisión se documenta por separado. No se entrenaron pesos.

Decisión: se mantiene Qwen3.5-2B. En la última calibración de Qwen3-4B con caché limitada hubo 62.506 ms hasta el primer texto de una corrección y 68.582 ms totales; la salida usó Olá en lugar de Hola. El chiste y JSON posteriores aprovecharon 57 tokens de caché y finalizaron. Estos ensayos privados con pausas no garantizan tiempos públicos; no se validó un reemplazo que cumpla el plazo y la calidad necesarios.

El menú refresca disponibilidad mientras está abierto. Automático y Conversación comparten un solo modelo de lenguaje; Core aporta herramientas. La ocupación ahora comprueba la ranura interna real de llama.cpp incluso después de cancelar una conexión. Las cuotas devuelven RATE_LIMITED y un Retry-After propio, distinguiéndose de MODEL_BUSY; el endpoint de ranuras permanece privado.

La petición de añadir un botón claro/oscuro conserva el HTML anterior. Se ejecutó su JavaScript en un DOM simulado, incluido localStorage bloqueado; no se afirma verificación visual en navegador. Las expresiones me quiero hacer daño y me voy a hacer daño reciben apoyo antes de otras preguntas o llamadas al modelo. La barrera de patrones sigue siendo limitada, no una evaluación clínica.

Verificación de producción: 23 comprobaciones de acceso, perfil, foto, persistencia, cierre y revocación de sesión, validación y prioridad de apoyo. Además, dos turnos HTTP de Core reprodujeron la creación de un catálogo y la petición exacta de tema de la captura, conservando los productos. No se suman a los 167 turnos del catálogo. Se retiró la única cuenta sintética de esta batería, su objeto y su archivo; quedaron cero cuentas de ese fixture. No quedan workers privados de evaluación.
