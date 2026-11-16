# Seguimiento del contexto de Elara

Se reprodujeron dos errores: una petición de aclarar una explicación podía modificar una web de un tema anterior, y el nombre de un proyecto desaparecía al salir de los dieciséis turnos enviados al modelo.

La selección de contexto ahora distingue el tema actual de un prototipo anterior, conserva datos explícitos del usuario en un resumen pequeño y aplica las correcciones más recientes. Una petición de reformulación incluye el texto concreto que debe editarse. Core resuelve preguntas directas sobre nombres conocidos y solicita datos ausentes. Una orden de empezar de cero reinicia el contexto de trabajo sin borrar los mensajes guardados. Los porcentajes consecutivos mantienen su base; después de otra conversación se pide la cantidad para evitar reutilizar una cifra antigua.

El resumen se construye dentro de cada solicitud a partir de los mensajes disponibles de este chat. No ajusta los pesos del modelo, no consulta otros chats y no convierte el historial local en memoria ilimitada. La API considera los últimos cuarenta mensajes dentro de sus límites de tamaño; el modelo recibe una selección más pequeña y un máximo total de 7.500 caracteres. Los límites de CPU, RAM y concurrencia del servidor se conservan.

## Validación local y del runtime

- 61 pruebas de regresión, incluidas dieciocho sobre continuidad, correcciones, reinicio, referencias, nombres, porcentajes y límites de entrada.
- Lint y build aprobados.
- Evaluación del motor híbrido: cuatro casos sobre el nombre corregido tras veinte turnos, una explicación posterior a una web antigua, un resumen de ideas de publicaciones y la ausencia de un nombre después de reiniciar el contexto. Las reformulaciones generales usan el modelo de Ubuntu; las preguntas directas de nombres y los resúmenes simples compatibles usan Core.
- Las generaciones de la muestra ajustada tardaron aproximadamente trece a dieciséis segundos. Son mediciones puntuales y una evaluación pequeña, no una garantía general de coherencia o latencia.

La primera ejecución reveló un resumen que cambiaba el propósito del texto y un nombre inventado; esos resultados motivaron incluir la fuente concreta para reformular y resolver nombres mediante datos explícitos. No se consideran respuestas correctas solo por contener una palabra del tema.

Una repetición pública mostró otra variación: el modelo podía explicar la tarea de resumir en vez de realizarla. Para respuestas breves de prosa y solicitudes simples de resumen, Core selecciona hasta dos oraciones originales y las reúne en una sola frase, con un máximo de cuarenta palabras. Es un resumen extractivo acotado; no se presenta como comprensión semántica de documentos largos, traducción ni una capacidad nueva de los pesos del modelo.

Prueba reproducible, después de compilar los tests, con las variables privadas existentes:

```sh
npm test
node --env-file=.env.local scripts/evaluate-conversation.mjs
```

Para comprobar el circuito público completo, el mismo script admite ELARA_TEST_URL y ELARA_QA_FIXTURE con una cuenta sintética propia; cierra esa sesión al terminar. No imprime contraseñas, cookies ni la clave del runtime.

## Comprobación pública final

Publicado el commit `ca93e00` en [Elara](https://elara-mu-mauve.vercel.app), despliegue `dpl_2sC7w6zWaeRu3nZbSwQCzxnmRUjM`, estado **Ready**. Después de la corrección del resumen, el recorrido público completo con acceso real de una cuenta sintética aprobó los cuatro casos:

| Caso | Motor | Tiempo de la muestra | Resultado |
|---|---|---:|---|
| Nombre corregido tras veinte turnos | Conversación | 5,1 s | Usó Nube, café y pasteles; no recuperó el nombre o los productos descartados. |
| Aclaración después de una web antigua | Conversación | 16,0 s | Explicó cómo las plantas aprovechan la luz; no editó el catálogo anterior. |
| Resumen de ideas de publicaciones | Core | 0,45 s | Conservó las ideas de publicar una guía de riego y mostrar una habitación con plantas. |
| Nombre tras empezar de cero | Core | 0,42 s | Solicitó el nombre en lugar de inventarlo o recuperar el descartado. |

La sesión de prueba se cerró. Se retiraron exactamente su cuenta sintética, un registro de almacenamiento y el archivo de avatar de prueba; la comprobación posterior devolvió cero cuentas restantes dentro de ese alcance. Novvin siguió respondiendo HTTP 200 y no se aumentaron los límites de los contenedores.

Las 61 pruebas, lint y build corresponden al código publicado. Estos cuatro casos son una muestra controlada de continuidad; no garantizan que el modelo pequeño resuelva correctamente cualquier conversación ni que conserve información fuera de su ventana de contexto.
