# Guía de Diseño, Código y Visor `index.html`

## 1. Sistema visual (*Cosmic Studio*)

- **Fondo base:** `#06080E` con resplandor radial sutil cian (`rgba(56,189,248,0.11)`) e índigo (`rgba(129,140,248,0.08)`).
- **Superficies elevadas:** `#0B0F18` (barra lateral), `#0D121D` / `#0E1421` (tarjetas y compositor) y bordes `#1B2436` / `#23304A`.
- **Tipografías (`next/font/google`):** `Plus Jakarta Sans` para lectura conversacional (< `76ch`) y `JetBrains Mono` exclusiva para bloques de código, líneas y badges técnicos.

## 2. Bloques de código y Markdown seguro ([MessageMarkdown.tsx](../components/MessageMarkdown.tsx))

- El parser de Markdown no utiliza `dangerouslySetInnerHTML`, eliminando riesgo de XSS en el chat principal.
- Soporta formato recursivo en línea (por ejemplo ``**código `index.html`**`` sin fugas de comillas invertidas), **tablas Markdown (`| col | col |`)**, citas, divisores horizontales y listas.
- El tokenizador propio ([lib/syntax-highlight.ts](../lib/syntax-highlight.ts)) colorea etiquetas HTML, atributos, cadenas, números, palabras clave y comentarios con numeración de líneas y plegado automático en bloques largos (`> 22` líneas).

## 3. Visor interactivo de `index.html` ([CodePreviewDrawer.tsx](../components/CodePreviewDrawer.tsx))

- **Selector de versiones (`v1`, `v2`, …):** permite navegar entre iteraciones HTML dentro del mismo chat.
- **Edición de HTML en vivo:** botón **Editar en vivo** en la pestaña `index.html` para ajustar código directamente y pulsar **Ver resultado** para previsualizar el cambio al instante.
- **Modo responsivo:** conmuta entre **Escritorio**, **Tablet (`768px`)** y **Móvil (`375px`)**.
- **Aislamiento en sandbox:** el `<iframe>` usa `sandbox="allow-scripts"` sin `allow-same-origin`, protegiendo `localStorage` y cookies de ELARA frente al código generado.
- **Puente de consola en vivo:** captura `console.log`, `console.warn`, `console.error` y errores de ejecución dentro del `index.html` mostrado, y ofrece un botón directo **Pedir a ELARA revisar** cuando aparece algún error.
