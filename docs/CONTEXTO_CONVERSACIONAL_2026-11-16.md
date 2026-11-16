# Seguimiento del contexto de Elara

Se reprodujeron dos errores: una petición de aclarar una explicación podía modificar una web de un tema anterior, y el nombre de un proyecto desaparecía al salir de los dieciséis turnos enviados al modelo.

La selección de contexto ahora distingue el tema actual de un prototipo anterior, conserva datos explícitos del usuario en un resumen pequeño y aplica las correcciones más recientes. Una petición de reformulación incluye el texto concreto que debe editarse. Core resuelve preguntas directas sobre nombres conocidos y solicita datos ausentes. Una orden de empezar de cero reinicia el contexto de trabajo sin borrar los mensajes guardados. Los porcentajes consecutivos mantienen su base; después de otra conversación se pide la cantidad para evitar reutilizar una cifra antigua.

El resumen se construye dentro de cada solicitud a partir de los mensajes disponibles de este chat. No ajusta los pesos del modelo, no consulta otros chats y no convierte el historial local en memoria ilimitada. La API considera los últimos cuarenta mensajes dentro de sus límites de tamaño; el modelo recibe una selección más pequeña y un máximo total de 7.500 caracteres. Los límites de CPU, RAM y concurrencia del servidor se conservan.

## Validación local y del runtime

- 60 pruebas de regresión, incluidas diecisiete sobre continuidad, correcciones, reinicio, referencias, nombres, porcentajes y límites de entrada.
- Lint y build aprobados.
- Evaluación real del motor híbrido en Ubuntu: cuatro casos aprobados, con tres generaciones del modelo y una respuesta determinista de Core. La muestra comprueba el nombre corregido tras veinte turnos, una explicación posterior a una web antigua, un resumen de ideas de publicaciones y la ausencia de un nombre después de reiniciar el contexto.
- Las generaciones de la muestra ajustada tardaron aproximadamente trece a dieciséis segundos. Son mediciones puntuales y una evaluación pequeña, no una garantía general de coherencia o latencia.

La primera ejecución reveló un resumen que cambiaba el propósito del texto y un nombre inventado; esos resultados motivaron incluir la fuente concreta para reformular y resolver nombres mediante datos explícitos. No se consideran respuestas correctas solo por contener una palabra del tema.

Prueba reproducible, después de compilar los tests, con las variables privadas existentes:

```sh
npm test
node --env-file=.env.local scripts/evaluate-conversation.mjs
```

Para comprobar el circuito público completo, el mismo script admite ELARA_TEST_URL y ELARA_QA_FIXTURE con una cuenta sintética propia; cierra esa sesión al terminar. No imprime contraseñas, cookies ni la clave del runtime.
