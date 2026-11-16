# Runtime propio de Elara

Elara está conectado al Ubuntu existente mediante una ruta nueva y acotada, `/elara-inference`, del Funnel de Tailscale. Las rutas anteriores de Novvin se conservan. El modelo no corre en la laptop.

## Servicios y límites

| Contenedor | Función | CPU máxima | RAM máxima |
|---|---|---:|---:|
| elara-model | llama.cpp, Qwen3.5-2B Q4_K_M | 2,5 | 3 GiB |
| elara-speech | whisper.cpp, Whisper base multilingüe | 2 | 768 MiB |
| elara-inference-gateway | autenticación, límites y proxy | 0,25 | 192 MiB |

El gateway admite **una tarea de inferencia a la vez**, compartida por conversación y voz. Devuelve HTTP 429 con Retry-After cuando está ocupado y limita a seis solicitudes por cuenta y minuto. Rechaza trabajo si MemAvailable es inferior a 2,5 GiB o la carga media de un minuto llega a 6. Core no utiliza este runtime.

Cada contenedor se ejecuta como usuario sin privilegios, con límites de procesos, sistema de archivos de solo lectura, capacidades retiradas y no-new-privileges. Los modelos y secretos se montan de solo lectura. Solo el gateway publica un puerto en loopback; los servidores de inferencia están dentro de la red Docker. Todos usan restart unless-stopped. Esto reinicia los servicios cuando Docker vuelve a arrancar; no sustituye la disponibilidad eléctrica ni de red del servidor.

La clave aleatoria se guarda en `/home/alvaro/elara-runtime/secrets/api-key`, con permisos privados, y como secreto de producción en Vercel. Nunca debe imprimirse en logs ni incluirse en Git. El gateway no admite carga de modelos, rutas de administración ni selección de servidores desde el cliente. Los IDs de cuenta enviados desde Vercel son HMAC; no se envían correos.

## Modelos y procedencia

- Conversación: [Qwen3.5-2B](https://huggingface.co/Qwen/Qwen3.5-2B), **dos mil millones de parámetros**, licencia Apache 2.0. Cuantización Q4_K_M de lmstudio-community, archivo de 1.270.808.032 bytes. Revisión y SHA-256 en model-lock.json; el archivo se descargó y verificó en Ubuntu.
- Voz: Whisper base multilingüe, archivo de 147.951.465 bytes. Revisión y SHA-256 en speech-model-lock.json. [Runtime oficial whisper.cpp](https://github.com/ggml-org/whisper.cpp).
- Las imágenes oficiales de llama.cpp, whisper.cpp y Node están fijadas por digest en los scripts de arranque. No se usan tags móviles al arrancar el servicio.

Se adaptaron instrucciones, contexto, selección de herramientas y evaluaciones del producto. **No se entrenaron ni ajustaron los pesos de Qwen o Whisper.** El clasificador pequeño de Core sí utiliza ejemplos propios. Los nombres de Elara no representan nuevos modelos fundacionales ni resultados de benchmark frente a otros asistentes.

## Operación

La carpeta instalada es `/home/alvaro/elara-runtime`. Los scripts de este directorio documentan el despliegue vigente:

- install-speech.sh descarga y comprueba el modelo de voz.
- start-runtime.sh crea los contenedores de conversación y gateway, si no existen, y añade exclusivamente la ruta de Elara al Funnel.
- start-speech.sh crea el contenedor de voz si no existe.
- inference-gateway.mjs contiene las rutas permitidas, límites y proxy.

Antes de una instalación nueva, prepara la red elara-runtime, las carpetas models/secrets, la clave privada y el modelo de conversación con el SHA-256 registrado. Estos scripts no sobrescriben contenedores existentes. Para aplicar otro límite a un contenedor existente, usa docker update sobre ese contenedor concreto; para aplicar un cambio al gateway, copia su archivo y reinicia solamente elara-inference-gateway. No borres ni recrees servicios de Novvin.

No hay registro de contenido de consultas en el gateway. Voz usa tmpfs para conversiones y logs de contenedor desactivados. La prueba verificó que no quedan archivos de audio tras la transcripción. Qwen usa contexto de 4096 tokens, una ranura, razonamiento interno desactivado y salidas acotadas a 192/256 tokens. La calidad y la velocidad dependen del tamaño pequeño y la CPU disponible.

Con el entorno privado local puede validarse el runtime con:

```sh
node --env-file=.env.local scripts/check-runtime.mjs
```

La prueba comprueba 401 sin clave, inferencia real, rechazo 429 de una segunda petición y disponibilidad de voz. No ejecuta una prueba de carga masiva ni revela la clave. Los scripts HTTP de autenticación, video, dictado y modelo están en scripts/.
