import type { IntentTrainingExample } from './neural-net';

export const ELARA_INTENTS: IntentTrainingExample[] = [
  {
    id: 'commerce_create',
    patterns: [
      'crea tienda online para vender productos',
      'haz pagina de venta de ropa',
      'quiero vender zapatos en una tienda virtual',
      'necesito catalogo de ventas con carrito',
      'diseña una pagina de comercio electronico',
      'creame una tienda de juguetes',
      'genera una web para vender comida',
      'haz una tienda para mi emprendimiento',
      'crea catalogo de productos en soles',
      'necesito una pagina para mi negocio de venta',
      'quiero un ecommerce de ropa con carrito',
      'hacer tienda para vender servicios por internet',
    ],
  },
  {
    id: 'greeting_help',
    patterns: [
      'hola',
      'hola elara',
      'buenos dias',
      'buenas tardes',
      'buenas noches',
      'que tal como estas',
      'necesito ayuda',
      'que puedes hacer',
      'como empiezo',
    ],
  },
  {
    id: 'identity_elara',
    patterns: [
      'quien eres',
      'como te llamas',
      'que es elara',
      'eres una inteligencia artificial',
      'quien te creo',
      'cual es tu motor',
      'funcionas sin openai',
      'estas en local o en servidor',
    ],
  },
  {
    id: 'novvin_ecosystem',
    patterns: [
      'como se conecta elara con novvin',
      'novvinapp',
      'iniciar sesion con novvin',
      'continuar con novvin',
      'red social novvin',
      'puedo usar elara sin login',
    ],
  },
  {
    id: 'code_index_landing',
    patterns: [
      'crea un index html',
      'genera un index para una pagina web',
      'haz una landing page en html',
      'dame codigo de una web basica',
      'index html moderno para copiar y pegar',
      'hazme una pagina web de inicio',
      'crea un sitio web sencillo en html y css',
    ],
  },
  {
    id: 'code_index_login',
    patterns: [
      'crea un index de login',
      'haz un formulario de inicio de sesion en html',
      'pantalla de login moderna html css',
      'login con boton continuar con novvin',
      'pagina de acceso o registro html',
    ],
  },
  {
    id: 'code_index_dashboard',
    patterns: [
      'crea un dashboard en html',
      'haz un panel administrativo index html',
      'tabla interactiva con filtro en html y js',
      'panel de metricas web basico',
    ],
  },
  {
    id: 'code_index_calculator',
    patterns: [
      'haz una calculadora en html y javascript',
      'crea una calculadora web interactiva',
      'app basica calculadora en un solo index',
    ],
  },
  {
    id: 'code_index_portfolio',
    patterns: [
      'crea un portafolio en html',
      'haz una web de curriculum personal index',
      'pagina de presentacion personal html',
    ],
  },
  {
    id: 'code_react_component',
    patterns: [
      'ejemplo de componente react con tailwind',
      'como crear un componente en nextjs',
      'dame un formulario en react typescript',
      'codigo react tsx basico',
    ],
  },
  {
    id: 'code_js_ts_basics',
    patterns: [
      'como funciona async await en javascript',
      'ejemplo de fetch a una api en js',
      'diferencia entre let const y var',
      'manejo de errores try catch en typescript',
    ],
  },
  {
    id: 'code_python_api',
    patterns: [
      'ejemplo basico de fastapi en python',
      'script python servidor http o api',
      'como leer json en python',
      'codigo python basico para backend',
    ],
  },
  {
    id: 'code_sql_postgres',
    patterns: [
      'consulta sql para crear tabla usuarios',
      'ejemplo de select con join en postgresql',
      'como crear indice en postgres',
      'sql basico insert update delete',
    ],
  },
  {
    id: 'code_git_deploy',
    patterns: [
      'comandos basicos de git push commit',
      'como subir proyecto a github y vercel',
      'como crear dockerfile basico para node',
      'subir servidor a docker compose ubuntu',
    ],
  },
  {
    id: 'guide_css_layout',
    patterns: [
      'diferencia entre flexbox y css grid',
      'como centrar un div con css moderno',
      'guia rapida de flexbox y grid responsivo',
      'diseno responsivo sin media queries',
    ],
  },
  {
    id: 'guide_regex',
    patterns: [
      'regex para validar correo email en javascript',
      'expresiones regulares comunes telefono url password',
      'como usar regex en js o python',
    ],
  },
  {
    id: 'guide_http_auth',
    patterns: [
      'diferencia entre get post put patch delete',
      'como funciona autenticacion jwt bearer token',
      'configurar cors en api rest backend',
    ],
  },
  {
    id: 'guide_js_arrays',
    patterns: [
      'como usar map filter reduce find en javascript',
      'metodos de arrays en js o typescript',
      'ejemplos de map y filter en arreglos',
    ],
  },
];

export interface KnowledgeArticle {
  id: string;
  keywords: string[];
  answer: string;
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'react_component',
    keywords: ['react', 'tsx', 'tailwind', 'componente', 'nextjs'],
    answer: `Aquí tienes un componente React + TypeScript con Tailwind listo para copiar:

\`\`\`tsx
'use client';

import { useState } from 'react';

export function QuickNoteCard({ title = 'Nueva nota' }: { title?: string }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<string[]>([]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setSaved((prev) => [clean, ...prev]);
    setText('');
  }

  return (
    <section className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-100">
      <h2 className="text-lg font-semibold">{title}</h2>
      <form onSubmit={handleSave} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe algo..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Guardar
        </button>
      </form>
      <ul className="mt-4 space-y-1 text-sm text-slate-300">
        {saved.map((item, idx) => (
          <li key={idx}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}
\`\`\``,
  },
  {
    id: 'js_async_fetch',
    keywords: ['async', 'await', 'fetch', 'javascript', 'typescript', 'promesa', 'const', 'let'],
    answer: `Guía rápida de \`async/await\` + \`fetch\` seguro en JavaScript/TypeScript:

1. \`fetch\` **no** lanza excepción en errores HTTP \`404\` o \`500\`; siempre revisa \`res.ok\`.
2. Usa \`AbortController\` para cancelar peticiones colgadas.

\`\`\`ts
export async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(\`Error HTTP \${res.status}\`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
\`\`\``,
  },
  {
    id: 'python_api',
    keywords: ['python', 'fastapi', 'uvicorn', 'backend', 'json'],
    answer: `Ejemplo mínimo de servidor **FastAPI** en Python listo para ampliar o conectar como servicio:

\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Elara Service")

class PromptIn(BaseModel):
    message: str

@app.get("/health")
def health():
    return {"ok": True, "service": "elara"}

@app.post("/ask")
def ask(body: PromptIn):
    return {"reply": f"Recibido: {body.message.strip()}"}
\`\`\``,
  },
  {
    id: 'sql_postgres',
    keywords: ['sql', 'postgres', 'postgresql', 'tabla', 'join', 'select', 'indice'],
    answer: `Esquema base y consulta con \`JOIN\` recomendada en **PostgreSQL**:

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_user_created ON messages (user_id, created_at DESC);

SELECT u.username, m.body, m.created_at
FROM messages m
JOIN users u ON u.id = m.user_id
ORDER BY m.created_at DESC
LIMIT 20;
\`\`\``,
  },
  {
    id: 'git_deploy',
    keywords: ['git', 'github', 'commit', 'push', 'vercel', 'docker', 'ubuntu'],
    answer: `Flujo rápido para subir código a GitHub y desplegar en Vercel o Docker:

\`\`\`bash
# 1. Inicializar y subir a GitHub
git init -b main
git add .
git commit -m "Versión inicial de Elara Web"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main

# 2. Desplegar en Vercel desde la raíz del proyecto
vercel --prod
\`\`\`

Y si levantas un servicio propio en Ubuntu con Docker:

\`\`\`bash
docker compose up -d --build
docker compose ps
\`\`\``,
  },
  {
    id: 'css_layout',
    keywords: ['flexbox', 'grid', 'css', 'centrar', 'layout', 'responsivo', 'responsive'],
    answer: `Comparativa rápida entre **Flexbox** y **CSS Grid**:

| Necesidad | Recomendado | Propiedad clave |
| --- | --- | --- |
| Alinear botones o barra en 1 eje | Flexbox | \`display: flex; gap: 12px;\` |
| Centrar horizontal y vertical | Grid o Flex | \`display: grid; place-items: center;\` |
| Tarjetas adaptables en 2D | CSS Grid | \`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))\` |

\`\`\`css
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
\`\`\``,
  },
  {
    id: 'regex_guide',
    keywords: ['regex', 'expresion', 'regular', 'validar', 'correo', 'email', 'telefono'],
    answer: `Expresiones regulares frecuentes listas para usar en JavaScript / TypeScript:

| Caso | Patrón | Notas |
| --- | --- | --- |
| Correo básico | \`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/\` | Validar además en servidor |
| Solo dígitos | \`/^\\d+$/\` | Útil para códigos o DNI |
| Usuario \`@handle\` | \`/^[a-z0-9_]{3,24}$/\` | Igual al formato usado en Novvin |
| Hex Color | \`/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/\` | Soporta formato corto y completo |

\`\`\`ts
export const isValidHandle = (value: string) => /^[a-z0-9_]{3,24}$/.test(value.trim());
\`\`\``,
  },
  {
    id: 'http_auth',
    keywords: ['jwt', 'bearer', 'cors', 'put', 'patch', 'delete', 'rest', 'endpoint', 'token', 'oauth'],
    answer: `Resumen práctico de métodos **REST** y autenticación con **Bearer / JWT**:

| Método | Uso correcto | ¿Idempotente? |
| --- | --- | --- |
| \`GET\` | Consultar datos sin modificarlos | Sí |
| \`POST\` | Crear recursos o iniciar acciones | No |
| \`PUT\` | Reemplazar un recurso completo | Sí |
| \`PATCH\` | Actualizar campos puntuales | Depende |
| \`DELETE\` | Eliminar un recurso | Sí |

Para validar un token sin bloquear el cliente, envía \`Authorization: Bearer <token>\` en cabeceras HTTPS y nunca guardes secretos en \`NEXT_PUBLIC_*\`.`,
  },
  {
    id: 'js_arrays',
    keywords: ['map', 'filter', 'reduce', 'find', 'some', 'array', 'arreglo'],
    answer: `Métodos esenciales de **Arrays** en JavaScript / TypeScript:

| Método | Qué devuelve | Caso típico |
| --- | --- | --- |
| \`map\` | Nuevo array transformado | Renderizar tarjetas o formatear DTOs |
| \`filter\` | Nuevo array filtrado | Buscar productos por texto o categoría |
| \`find\` | Primer elemento o \`undefined\` | Localizar un usuario por ID |
| \`reduce\` | Un valor acumulado | Calcular total del carrito |

\`\`\`ts
const total = items
  .filter((x) => x.inStock)
  .reduce((acc, item) => acc + item.price, 0);
\`\`\``,
  },
];
