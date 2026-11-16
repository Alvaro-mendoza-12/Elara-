# ELARA (`E L A R A`)

Interfaz conversacional web de **ELARA** desarrollada con Next.js 16, React 19, Tailwind CSS v4 y Vercel AI SDK (`useChat` + `createUIMessageStream`), lista para usarse en acceso libre, previsualizar webs `index.html` en vivo y conectarse con tu propio servidor GPU o con el ecosistema **Novvin** (`novvinapp.com`).

## Características principales

- **Chat en tiempo real + ventana deslizante estable**: conserva hasta 40 turnos de contexto hacia el servidor sin provocar errores HTTP 400 en conversaciones largas y muestra el error exacto si falla la red o la API.
- **Límite en modo invitado y flujo "Continuar con Novvin"**:
  - Hasta **20 mensajes gratuitos** en acceso libre con barra de progreso en la barra lateral.
  - Botón **Continuar con Novvin** con paso para crear tu nombre, `@usuario`, enfoque y avatar para desbloquear conversaciones ilimitadas en el navegador (listo para enlazar OAuth con `novvinapp.com`).
- **Generación de webs `index.html` ajustadas al tema pedido**:
  - Sintetiza catálogos/tiendas dinámicas según el tema y cantidad solicitada (ej. *"Generame una web de 20 juguetes de perritos"*), pantallas de login, paneles con filtro, portafolios y calculadoras.
- **Bloques de código y Visor `index.html` avanzado**:
  - Resaltado de sintaxis con numeración de líneas, copiar, descargar y contraer/expandir.
  - Visor lateral con selector de versiones (`v1`, `v2`…), vista **Escritorio / Tablet / Móvil**, recarga, apertura en pestaña nueva y consola en vivo capturando errores del `<iframe>` en sandbox.
- **Seguridad prioritaria**: detección inmediata de mensajes de autolesión/crisis devolviendo líneas gratuitas reales de ayuda (Línea 113 Opción 5, SAMU 106, 988, 024, `findahelpline.com`) en lugar de mensajes genéricos de sistema.

## Documentación y guías

- [Arquitectura de ELARA](docs/ARQUITECTURA.md)
- [Guía del sistema de diseño, resaltado y Visor de `index.html`](docs/GUIA_DISENO_Y_VISOR.md)
- [Guía de integración "Continuar con Novvin" (OAuth + App Android)](docs/GUIA_CONEXION_NOVVIN.md)
- [Guía para conectar tu servidor propio / Ubuntu / GPU](docs/GUIA_SERVIDOR_PROPIO.md)
- [Despliegue del servicio compañero en Ubuntu](server/README_UBUNTU.md)

## Comandos locales

```bash
npm install
npm test
npm run lint
npm run build
```
