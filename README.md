# Elara 0.7

Asistente independiente en `D:\Elara`. [Sitio público](https://elara-mu-mauve.vercel.app) · [GitHub](https://github.com/Alvaro-mendoza-12/Elara-).

## Qué ofrece

- **Automático** combina Core con Conversación cuando la petición necesita lenguaje general. **Core rápido** crea prototipos HTML, revisa código y resuelve utilidades. Sigue disponible sin registro y sin límite de mensajes.
- **Conversación** usa Qwen3.5-2B: **dos mil millones de parámetros**, cuantizados en Q4_K_M y ejecutados con llama.cpp en Ubuntu. Es un modelo abierto adaptado mediante instrucciones, contexto y herramientas de Elara. No se entrenaron sus pesos desde cero ni se hizo fine-tuning del LLM.
- El acceso real de **Novvin** verifica correo, contraseña, sesión y segundo factor cuando corresponde. La creación de cuentas abre el formulario oficial de Novvin. El perfil muestra imagen, GIF o video; los videos se reproducen sin sonido y limitan el bucle a doce segundos.
- El historial de cada cuenta y el del invitado se guardan por separado en el navegador. Al volver a la misma cuenta se recupera su historial local. **Todavía no hay sincronización entre dispositivos.** El antiguo historial compartido se conserva sin asignarlo automáticamente a una cuenta.
- El contexto del chat conserva datos explícitos del usuario y las correcciones más recientes dentro de la ventana disponible. Peticiones como «resúmelo» usan el texto anterior; cambiar de tema deja de editar una web antigua. «Olvida lo anterior» reinicia el contexto sin borrar el historial. No es aprendizaje de pesos ni memoria ilimitada.
- El enrutamiento distingue explicaciones, ideas y traducciones de la creación de webs. Se comprueban 1.200 escenarios de herramientas y contexto, además de conversaciones reales evaluadas por separado. Algunos temas educativos reciben notas breves de fuentes primarias; eso no añade navegación ni garantiza todas las respuestas.
- Las consultas de integrales y ejercicios polinómicos compatibles usan el calculador de Core sin esperar al modelo general. Puede ofrecer de uno a cinco ejercicios y resolver el que indiques. Las respuestas interrumpidas se marcan como incompletas y no se reutilizan como contexto; el cliente limita la espera de una petición completa a 45 segundos.
- Dictado con micrófono y transcripción de audio en el servidor propio con Whisper base. Máximo treinta segundos por grabación; el texto se coloca en el editor para revisarlo antes de enviarlo. Requiere Novvin y permiso del micrófono.
- Modo claro, oscuro, dispositivo y mayor contraste; preferencia de animación de avatares; logo de tres pliegues, carga inicial y estados de escritura.
- Copiar y editar mensajes propios, exportar Markdown, adjuntar código y probar HTML en un visor aislado con versiones, edición, recarga, descarga, rotación, ajuste y separador de ancho. Los dispositivos usan viewports reales de 1280×800, 768×1024 y 390×844.

Los prototipos incluyen datos de ejemplo. Sus accesos, reservas y pedidos no equivalen a un backend comercial. El modelo puede equivocarse, no navega por internet y no tiene acceso a datos privados del negocio. Los casos de riesgo personal detectados reciben una respuesta de apoyo antes de cualquier modelo y antes de depender del acceso de Novvin.

## Dónde funciona

La interfaz y el BFF Next.js se ejecutan en Vercel. Ubuntu aloja Novvin y los tres contenedores independientes de Elara: conversación, voz y gateway. **La laptop puede estar apagada.** Ubuntu y su conexión deben seguir disponibles para Novvin, Conversación y dictado; Core anónimo se ejecuta en Vercel.

Se conserva la red social y sus rutas existentes. No se activó ningún proveedor de IA de pago. El runtime reserva recursos, atiende una tarea de inferencia a la vez y devuelve un aviso de espera ante concurrencia. Consulta [operación del servidor](deployment/README.md).

## Desarrollo y validación

Next.js 16, React 19, TypeScript y Vercel AI SDK. Las credenciales de sesión van cifradas en una cookie HttpOnly, Secure en producción y SameSite=Lax. Los tokens de Novvin y la clave del modelo nunca se entregan al navegador.

Configura las variables descritas en `.env.example`; no publiques `.env.local` ni `.vercel/`.

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev -- --port 3107
node scripts/check-contrast.mjs
node scripts/evaluate-core.mjs
npm run eval:responses
```

`node scripts/smoke.mjs` prueba el BFF contra `http://127.0.0.1:3107`. `ELARA_TEST_URL` permite probar producción. **Crea una cuenta sintética real en Novvin**, con correo `example.invalid`, y conserva un fixture privado en `.vercel/`. Retira únicamente esos datos de prueba al terminar. Los scripts `check-model.mjs`, `check-avatar-video.mjs` y `check-dictation.mjs` reutilizan un fixture; no contienen contraseñas. Las pruebas de dictado emplean una grabación sintética, no el micrófono personal.

`scripts/evaluate-responses.mjs` registra los casos de enrutamiento sin generar 1.200 respuestas del modelo. `scripts/evaluate-live-dialogues.mjs` utiliza el fixture sintético mediante `ELARA_QA_FIXTURE` y realiza conversaciones reales de forma secuencial, con pausas y límites. Su criterio automático no equivale a exactitud semántica: [método, catálogo y revisiones](evals/RESPONSE_QUALITY.md).

## Documentación

- [Entrega y pruebas](docs/ENTREGA_2026-11-16.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Novvin](docs/GUIA_CONEXION_NOVVIN.md)
- [Diseño](docs/DISENO.md)
- [Operación y límites de Ubuntu](deployment/README.md)

`server/` conserva el servidor compañero anterior; la producción actual utiliza `app/api/` y `deployment/`.
