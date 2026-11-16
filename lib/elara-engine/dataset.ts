import type { IntentTrainingExample } from './neural-net';

export const ELARA_INTENTS: IntentTrainingExample[] = [
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
];
