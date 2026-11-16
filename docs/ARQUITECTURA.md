# Arquitectura de Elara 0.5

```text
Navegador
  ├─ Conversaciones locales y exportación Markdown
  ├─ /api/chat → validación Zod → ventana de 40 mensajes / 100.000 caracteres → streaming
  ├─ /api/auth/login, register, session, logout
  └─ Visor HTML sandbox allow-scripts (sin acceso al origen de Elara)

Vercel / Next.js
  ├─ Core 0.5: reglas + clasificación de intenciones + utilidades + plantillas
  ├─ Proveedor OpenAI-compatible o AI Gateway opcional; no configurados en esta entrega
  └─ BFF de Novvin → HTTPS → Ubuntu Novvin
        ├─ login / register con contrato web existente
        ├─ refresh comprueba revocación y suspensión en servidor
        └─ logout revoca exactamente la sesión del navegador
```

El secreto de Elara cifra la credencial de renovación de Novvin mediante AES-256-GCM. La cookie del navegador es HttpOnly, SameSite=Lax y Secure en producción; nunca se confía en un nombre local como identidad autenticada. Las mutaciones comprueban Origin contra Host y rechazan contextos cross-site. El proxy servidor habla el contrato web de primera parte de Novvin, con su origen canónico y etiqueta `ELARA Web`; no es OAuth ni inicia automáticamente una sesión ya abierta en otro dominio.

La cookie no conserva contraseña ni perfil. Cada lectura de sesión consulta a Novvin, que valida su vigencia. El perfil público solo contiene los campos de presentación. Los fallos de disponibilidad conservan el estado para permitir un reintento. El cierre se confirma únicamente tras recibir respuesta de Novvin.

Los mensajes aceptados son user/assistant con partes de texto. Se permite y elimina `step-start`, metadato generado por el AI SDK. Las instrucciones system enviadas por el cliente se rechazan. Se limita el cuerpo a 1 MB, cada parte a 50.000 caracteres y el contexto completo a 100.000 caracteres sin cortar bloques de código.

El motor básico conserva marca, color, cantidad y moneda de los catálogos al editarlos. Rechaza coincidencias débiles del clasificador y reconoce cambios de tema. La memoria de nombres procede de mensajes del usuario en la conversación actual. No sincroniza conversaciones entre dispositivos y no consulta internet.

El visor valida que postMessage proceda de su iframe. Los prototipos usan textContent para el catálogo; los datos JSON se escapan antes de insertarlos en script. Abrir HTML en una pestaña independiente ejecuta ese código: debe revisarse antes de publicarlo o proporcionar datos reales.

No hay cuota comercial de 20 mensajes ni promesas de consumo ilimitado de proveedores. El acceso libre usa el motor básico. Antes de habilitar un proveedor de pago se requiere una política de consumo con almacenamiento compartido y límites de presupuesto.
