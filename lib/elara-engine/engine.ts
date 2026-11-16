import { inspectCodeSnippet } from './code-analyzer';
import {
  buildCalculatorIndexHtml,
  buildDashboardIndexHtml,
  buildLandingIndexHtml,
  buildLoginIndexHtml,
  buildPortfolioIndexHtml,
} from './code-synthesizer';
import { ELARA_INTENTS, KNOWLEDGE_ARTICLES } from './dataset';
import { buildTrainedIntentNetwork, type ElaraIntentNetwork } from './neural-net';
import { extractFencedCodeBlocks, extractPromptParams, tokenize } from './text';

export interface SimpleTurn {
  role: string;
  text: string;
}

export interface EngineResult {
  reply: string;
  intent: string;
  confidence: number;
}

let cachedNetwork: ElaraIntentNetwork | null = null;

function getIntentNetwork(): ElaraIntentNetwork {
  if (!cachedNetwork) {
    cachedNetwork = buildTrainedIntentNetwork(ELARA_INTENTS);
  }
  return cachedNetwork;
}

function scoreArticleOverlap(queryTokens: string[], keywords: string[]): number {
  const tokenSet = new Set(queryTokens);
  let hits = 0;
  for (const kw of keywords) {
    if (tokenSet.has(kw)) hits += 1;
  }
  return hits;
}

function buildHtmlResponse(title: string, html: string, wantsCodeOnly: boolean): string {
  if (wantsCodeOnly) {
    return `\`\`\`html\n${html}\n\`\`\``;
  }
  return `${title}

\`\`\`html
${html}
\`\`\`

Puedes pulsar **Vista previa en vivo** en el bloque superior para probar este \`index.html\` ahora mismo, o copiarlo con un clic.`;
}

function findPreviousHtml(turns: SimpleTurn[]): { prompt: string; html: string } | null {
  for (let i = turns.length - 2; i >= 0; i -= 1) {
    if (turns[i].role === 'assistant') {
      const htmlBlock = extractFencedCodeBlocks(turns[i].text).find((b) => b.lang === 'html');
      if (htmlBlock) {
        const prevUser = i > 0 && turns[i - 1].role === 'user' ? turns[i - 1].text : '';
        return { prompt: prevUser, html: htmlBlock.code };
      }
    }
  }
  return null;
}

function formatStaticReview(text: string, codeBlocks: Array<{ lang: string; code: string }>): string {
  const target = codeBlocks[0] ?? { lang: 'auto', code: text };
  const inspection = inspectCodeSnippet(target.lang, target.code);
  if (inspection.findings.length === 0) {
    return `Revisé el fragmento (${inspection.detectedKind.toUpperCase()}) y **no detecté errores de sintaxis ni delimitadores sin cerrar**. Si tienes un fallo en ejecución, pega el mensaje de error exacto para analizarlo.`;
  }
  const lines = inspection.findings.map((f) => {
    const tag = f.severity === 'error' ? 'Error' : f.severity === 'warning' ? 'Advertencia' : 'Sugerencia';
    return `- **${tag}:** ${f.message}`;
  });
  return `Análisis estático del código (**${inspection.detectedKind.toUpperCase()}**):\n\n${lines.join('\n')}`;
}

function buildContextualFollowUp(userText: string, prevHtml: { prompt: string; html: string }): string | null {
  const params = extractPromptParams(userText);
  const norm = params.normalized;
  if (!/(cambia|ponle|actualiza|modifica|tema\s+claro|tema\s+oscuro|blanco|oscuro|titulo|título|nombre|explica)/.test(norm)) {
    return null;
  }

  if (/\bexplica\b/.test(norm)) {
    return 'El `index.html` anterior está dividido en 3 bloques autocontenidos:\n\n1. **`<style>` con variables `:root`**: centraliza los colores de fondo, tarjetas y acento.\n2. **`<main>` semántico**: mantiene la estructura adaptable para escritorio y móvil.\n3. **`<script>` seguro**: conecta los eventos con `addEventListener` y actualiza texto usando `textContent` para evitar inyecciones.';
  }

  const combinedPrompt = `${prevHtml.prompt} ${userText}`;
  const merged = extractPromptParams(combinedPrompt);
  const wantsLight = /\b(clar[ao]|blanc[ao]|light)\b/.test(norm)
    ? 'light'
    : /\b(oscur[ao]|negro|dark)\b/.test(norm)
      ? 'dark'
      : merged.preferredTheme;
  merged.preferredTheme = wantsLight;
  if (params.brandName) merged.brandName = params.brandName;

  if (prevHtml.html.includes('loginForm')) {
    return buildHtmlResponse('Actualicé tu pantalla de acceso según lo solicitado:', buildLoginIndexHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('countStat')) {
    return buildHtmlResponse('Actualicé tu panel `index.html`:', buildDashboardIndexHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('evalSafe')) {
    return buildHtmlResponse('Actualicé tu calculadora interactiva:', buildCalculatorIndexHtml(merged), params.wantsCodeOnly);
  }
  return buildHtmlResponse('Actualicé tu archivo `index.html` manteniendo tus preferencias:', buildLandingIndexHtml(merged), params.wantsCodeOnly);
}

export function runElaraCoreEngine(turns: SimpleTurn[]): EngineResult {
  const latestUser = [...turns].reverse().find((t) => t.role === 'user')?.text.trim() ?? '';
  if (!latestUser) {
    return {
      reply: 'Escribe una consulta o pídeme generar un `index.html` para comenzar.',
      intent: 'empty',
      confidence: 1,
    };
  }

  const params = extractPromptParams(latestUser);
  const looksLikePastedCode =
    params.codeBlocks.length > 0 ||
    (/[{};]/.test(latestUser) && latestUser.split('\n').length >= 2) ||
    /<\/?[a-z]+[\s>]/i.test(latestUser);

  if (looksLikePastedCode && /(revisa|error|falla|arregla|corrige|valida|analiza|que esta mal)/i.test(params.normalized)) {
    return {
      reply: formatStaticReview(latestUser, params.codeBlocks),
      intent: 'code_inspect_user_snippet',
      confidence: 0.92,
    };
  }
  if (params.codeBlocks.length > 0) {
    return {
      reply: formatStaticReview(latestUser, params.codeBlocks),
      intent: 'code_inspect_user_snippet',
      confidence: 0.88,
    };
  }

  const previousHtml = findPreviousHtml(turns);
  if (previousHtml) {
    const followUp = buildContextualFollowUp(latestUser, previousHtml);
    if (followUp) {
      return { reply: followUp, intent: 'code_index_followup', confidence: 0.9 };
    }
  }

  // Deterministic code-generation shortcuts take priority over weak fuzzy matches
  const norm = params.normalized;
  if (/\b(login|iniciar\s+sesion|acceso|registro)\b/.test(norm) && /\b(index|html|pagina|web|formulario|codigo)\b/.test(norm)) {
    return {
      reply: buildHtmlResponse('Aquí tienes un `index.html` de inicio de sesión listo para copiar y previsualizar:', buildLoginIndexHtml(params), params.wantsCodeOnly),
      intent: 'code_index_login',
      confidence: 0.95,
    };
  }
  if (/\bcalculadora\b/.test(norm)) {
    return {
      reply: buildHtmlResponse('Aquí tienes una calculadora interactiva en un solo `index.html`:', buildCalculatorIndexHtml(params), params.wantsCodeOnly),
      intent: 'code_index_calculator',
      confidence: 0.95,
    };
  }
  if (/\b(dashboard|panel)\b/.test(norm) && /\b(index|html|web|codigo)\b/.test(norm)) {
    return {
      reply: buildHtmlResponse('Generé este panel interactivo en `index.html` con filtro en tiempo real:', buildDashboardIndexHtml(params), params.wantsCodeOnly),
      intent: 'code_index_dashboard',
      confidence: 0.94,
    };
  }
  if (/\b(portafolio|portfolio|curriculum)\b/.test(norm)) {
    return {
      reply: buildHtmlResponse('Aquí tienes un `index.html` de portafolio limpio y adaptable:', buildPortfolioIndexHtml(params), params.wantsCodeOnly),
      intent: 'code_index_portfolio',
      confidence: 0.94,
    };
  }
  if (/\b(index|index\.html|landing|pagina\s+web|sitio\s+web)\b/.test(norm) && /\b(crea|genera|haz|hazme|dame|construye|codigo)\b/.test(norm)) {
    return {
      reply: buildHtmlResponse('Generé tu `index.html` completo y responsivo:', buildLandingIndexHtml(params), params.wantsCodeOnly),
      intent: 'code_index_landing',
      confidence: 0.93,
    };
  }

  const net = getIntentNetwork();
  const prediction = net.predict(latestUser);

  if (prediction.confidence >= 0.42) {
    switch (prediction.label) {
      case 'greeting_help':
        return {
          reply:
            'Hola, soy **ELARA**. Ya puedes usarme directamente sin iniciar sesión.\n\nEn esta primera versión propia (**Elara Core v0.1**) puedo ayudarte con:\n- Generar código **`index.html`** completo (landing, login, panel, portafolio, calculadora) con **Vista previa en vivo**.\n- Snippets rápidos de **React/TypeScript, Python, PostgreSQL, Git y Docker**.\n- Revisión sintáctica básica de fragmentos de **HTML, JSON, JS o SQL** que pegues aquí.',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'identity_elara':
        return {
          reply:
            'Soy **ELARA** (`E L A R A`), el asistente web propio pensado para crecer junto al ecosistema de **Novvin**.\n\nActualmente respondo mediante **Elara Core v0.1**, un motor propio ligero en TypeScript (clasificador neuronal de intenciones + búsqueda semántica + sintetizador de código web). Cuando conectes un modelo mayor en tu servidor mediante `ELARA_UPSTREAM_URL`, la interfaz usará ese servidor sin cambiar nada en el frontend.',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'novvin_ecosystem':
        return {
          reply:
            'Por ahora **ELARA** funciona con **acceso libre sin login**, guardando tus conversaciones únicamente en tu navegador.\n\nEn la siguiente fase se integrará el flujo **"Continuar con Novvin"**:\n- Al pulsar *Continuar con Novvin* desde móvil o escritorio se abrirá la confirmación segura en **Novvin** (`novvinapp.com`) para reutilizar la sesión activa y devolver un token autorizado hacia ELARA.',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_index_landing':
        return {
          reply: buildHtmlResponse('Generé tu `index.html` completo y responsivo:', buildLandingIndexHtml(params), params.wantsCodeOnly),
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_index_login':
        return {
          reply: buildHtmlResponse('Aquí tienes un `index.html` de inicio de sesión listo para probar:', buildLoginIndexHtml(params), params.wantsCodeOnly),
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_index_dashboard':
        return {
          reply: buildHtmlResponse('Aquí tienes un panel web `index.html` interactivo:', buildDashboardIndexHtml(params), params.wantsCodeOnly),
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_index_calculator':
        return {
          reply: buildHtmlResponse('Aquí tienes una calculadora web en `index.html`:', buildCalculatorIndexHtml(params), params.wantsCodeOnly),
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_index_portfolio':
        return {
          reply: buildHtmlResponse('Aquí tienes un `index.html` de portafolio profesional:', buildPortfolioIndexHtml(params), params.wantsCodeOnly),
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_react_component':
      case 'code_js_ts_basics':
      case 'code_python_api':
      case 'code_sql_postgres':
      case 'code_git_deploy': {
        const keyMap: Record<string, string> = {
          code_react_component: 'react_component',
          code_js_ts_basics: 'js_async_fetch',
          code_python_api: 'python_api',
          code_sql_postgres: 'sql_postgres',
          code_git_deploy: 'git_deploy',
        };
        const article = KNOWLEDGE_ARTICLES.find((a) => a.id === keyMap[prediction.label]);
        if (article) {
          return { reply: article.answer, intent: prediction.label, confidence: prediction.confidence };
        }
        break;
      }
      default:
        break;
    }
  }

  // Fallback to direct keyword/semantic lookup across curated articles
  const qTokens = tokenize(latestUser);
  let bestArticle = KNOWLEDGE_ARTICLES[0];
  let bestHits = 0;
  for (const article of KNOWLEDGE_ARTICLES) {
    const hits = scoreArticleOverlap(qTokens, article.keywords);
    if (hits > bestHits) {
      bestHits = hits;
      bestArticle = article;
    }
  }
  if (bestHits >= 1) {
    return { reply: bestArticle.answer, intent: `kb_${bestArticle.id}`, confidence: 0.65 };
  }

  return {
    reply: `Estoy operando con **Elara Core v0.1** (motor propio inicial sin LLM externo conectado), así que aún no respondo consultas abiertas fuera de mi entrenamiento actual.\n\nSí puedo hacer esto ahora mismo para ti:\n- **Generar una web \`index.html\`** (pídeme: *"Crea un index.html moderno para Novvin"* o *"Haz un login / calculadora / panel web"*).\n- **Dar snippets base** de React, JavaScript, Python FastAPI, PostgreSQL o Git/Docker.\n- **Revisar errores básicos** si pegas tu código HTML, JSON, JS o SQL.\n\nCuando conectes tu servidor con un modelo generativo completo en \`ELARA_UPSTREAM_URL\`, responderé cualquier pregunta abierta sin cambiar esta interfaz.`,
    intent: '__fallback_honest__',
    confidence: prediction.confidence,
  };
}
