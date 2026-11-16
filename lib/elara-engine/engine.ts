import { inspectCodeSnippet } from './code-analyzer';
import {
  buildCalculatorIndexHtml,
  buildDashboardIndexHtml,
  buildLandingIndexHtml,
  buildLoginIndexHtml,
  buildPortfolioIndexHtml,
} from './code-synthesizer';
import { tryConversationalResponse } from './conversational';
import { ELARA_INTENTS, KNOWLEDGE_ARTICLES } from './dataset';
import { buildTrainedIntentNetwork, type ElaraIntentNetwork } from './neural-net';
import { detectCrisisHelpResponse } from './safety';
import { extractFencedCodeBlocks, extractPromptParams, tokenize } from './text';
import {
  buildBlogHtml,
  buildBookingFormHtml,
  buildCatalogStoreHtml,
  buildPaletteGeneratorHtml,
  buildPomodoroHtml,
  buildQuizAppHtml,
  buildTodoAppHtml,
  buildWebFromPrompt,
} from './web-builder';

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

Pulsa **Vista previa** en el bloque superior (o **Abrir visor index** arriba) para probarlo en vivo en escritorio, tablet o móvil.`;
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
    return `Revisé el fragmento (${inspection.detectedKind.toUpperCase()}) y **no detecté errores de sintaxis ni delimitadores sin cerrar**. Si tienes un fallo en ejecución, pega el mensaje exacto del error para revisarlo.`;
  }
  const lines = inspection.findings.map((f) => {
    const tag = f.severity === 'error' ? 'Error' : f.severity === 'warning' ? 'Advertencia' : 'Sugerencia';
    return `- **${tag}:** ${f.message}`;
  });
  return `Análisis del fragmento (**${inspection.detectedKind.toUpperCase()}**):\n\n${lines.join('\n')}`;
}

function buildContextualFollowUp(userText: string, prevHtml: { prompt: string; html: string }): string | null {
  const params = extractPromptParams(userText);
  const norm = params.normalized;
  if (
    !/(cambia|ponle|ponlo|actualiza|modifica|agrega|anade|color|tema\s+claro|tema\s+oscuro|blanco|oscuro|soles|euros|dolares|titulo|nombre|explica|corrige|error)/.test(
      norm,
    )
  ) {
    return null;
  }

  if (/\bexplica\b/.test(norm)) {
    return 'El `index.html` anterior está organizado en tres bloques autocontenidos:\n\n1. **`<style>` con variables `:root`**: centraliza fondo, bordes y color principal.\n2. **HTML5 semántico**: diseño adaptable a escritorio y móvil sin librerías externas.\n3. **`<script>` seguro**: conecta los eventos con `addEventListener` y actualiza textos con `textContent`.';
  }

  const prevParams = extractPromptParams(prevHtml.prompt);
  const combinedPrompt = `${prevHtml.prompt} ${userText}`;
  const merged = extractPromptParams(combinedPrompt);
  const wantsLight = /\b(clar[ao]|blanc[ao]|light)\b/.test(norm)
    ? 'light'
    : /\b(oscur[ao]|negro|dark)\b/.test(norm)
      ? 'dark'
      : prevParams.preferredTheme;
  merged.preferredTheme = wantsLight;
  merged.accentColor = params.accentColor || prevParams.accentColor;
  if (/\b(soles|sol\s+peruano|pen)\b/.test(norm)) merged.currencySymbol = 'S/';
  else if (/\b(euros?|eur)\b/.test(norm)) merged.currencySymbol = '€';
  else if (/\b(dolares|usd)\b/.test(norm)) merged.currencySymbol = '$';
  else merged.currencySymbol = prevParams.currencySymbol;

  if (params.brandName) merged.brandName = params.brandName;
  const addMoreMatch = norm.match(/(?:agrega|anade|suma)\s+(\d{1,2})\s*(?:mas|elementos|productos|items)?/);
  if (addMoreMatch?.[1]) {
    const baseCount = prevParams.requestedCount ?? (/\b20\b/.test(prevParams.normalized) ? 20 : 12);
    merged.requestedCount = Math.min(40, baseCount + Number(addMoreMatch[1]));
  } else if (params.requestedCount) {
    merged.requestedCount = params.requestedCount;
  } else {
    merged.requestedCount = prevParams.requestedCount;
  }

  if (prevHtml.html.includes('data-elara-app="catalog"') || prevHtml.html.includes('catalogGrid')) {
    return buildHtmlResponse('Actualicé el catálogo `index.html` con tus cambios:', buildCatalogStoreHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="todo"')) {
    return buildHtmlResponse('Actualicé tu gestor de tareas `index.html`:', buildTodoAppHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="pomodoro"')) {
    return buildHtmlResponse('Actualicé tu temporizador Pomodoro `index.html`:', buildPomodoroHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="quiz"')) {
    return buildHtmlResponse('Actualicé la trivia interactiva `index.html`:', buildQuizAppHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="palette"')) {
    return buildHtmlResponse('Actualicé el generador de paletas `index.html`:', buildPaletteGeneratorHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="blog"')) {
    return buildHtmlResponse('Actualicé tu blog / revista `index.html`:', buildBlogHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('data-elara-app="form"')) {
    return buildHtmlResponse('Actualicé el formulario `index.html`:', buildBookingFormHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('loginForm')) {
    return buildHtmlResponse('Actualicé la pantalla de acceso según lo pedido:', buildLoginIndexHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('countStat')) {
    return buildHtmlResponse('Actualicé el panel `index.html`:', buildDashboardIndexHtml(merged), params.wantsCodeOnly);
  }
  if (prevHtml.html.includes('evalSafe')) {
    return buildHtmlResponse('Actualicé la calculadora interactiva:', buildCalculatorIndexHtml(merged), params.wantsCodeOnly);
  }
  return buildHtmlResponse('Actualicé tu archivo `index.html`:', buildLandingIndexHtml(merged), params.wantsCodeOnly);
}

export function runElaraCoreEngine(turns: SimpleTurn[]): EngineResult {
  const latestUser = [...turns].reverse().find((t) => t.role === 'user')?.text.trim() ?? '';
  if (!latestUser) {
    return {
      reply: 'Escribe tu consulta o dime qué página o código necesitas.',
      intent: 'empty',
      confidence: 1,
    };
  }

  // 1. Crisis & self-harm priority safeguard — NEVER respond with generic AI status.
  const crisisReply = detectCrisisHelpResponse(latestUser);
  if (crisisReply) {
    return {
      reply: crisisReply,
      intent: 'safety_crisis_support',
      confidence: 1,
    };
  }

  const params = extractPromptParams(latestUser);
  const norm = params.normalized;

  // 2. JSON formatting & pasted code review (handles attached files or fenced snippets cleanly)
  if (params.codeBlocks.length > 0) {
    const firstBlock = params.codeBlocks[0];
    if (
      /\b(formatea|pretty|embellece|ordena|indent)\b/.test(norm) &&
      (firstBlock.lang === 'json' || /^\s*[\[{]/.test(firstBlock.code))
    ) {
      const formattedConv = tryConversationalResponse(`formatea json ${firstBlock.code}`);
      if (formattedConv) {
        return { reply: formattedConv.reply, intent: formattedConv.intent, confidence: 0.96 };
      }
    }
    return {
      reply: formatStaticReview(latestUser, params.codeBlocks),
      intent: 'code_inspect_user_snippet',
      confidence: 0.92,
    };
  }

  const looksLikePastedCode =
    (/[{};]/.test(latestUser) && latestUser.split('\n').length >= 2) ||
    /<\/?[a-z]+[\s>]/i.test(latestUser);

  if (looksLikePastedCode && /(revisa|error|falla|arregla|corrige|valida|analiza|que esta mal)/i.test(norm)) {
    return {
      reply: formatStaticReview(latestUser, params.codeBlocks),
      intent: 'code_inspect_user_snippet',
      confidence: 0.94,
    };
  }

  // 3. Arithmetic, percentages, HTTP codes, small talk, time
  const directConv = tryConversationalResponse(latestUser);
  if (directConv) {
    return {
      reply: directConv.reply,
      intent: directConv.intent,
      confidence: 0.95,
    };
  }

  // 4. Follow-up tweaks to previously generated HTML in the conversation
  const previousHtml = findPreviousHtml(turns);
  if (previousHtml) {
    const followUp = buildContextualFollowUp(latestUser, previousHtml);
    if (followUp) {
      return { reply: followUp, intent: 'code_index_followup', confidence: 0.92 };
    }
  }

  // 5. Explicit web/app generation with real topic/item synthesis (e.g. "20 juguetes de perritos")
  const wantsWeb =
    /\b(web|webs|pagina|paginas|sitio|sitios|index|index\.html|html|tiendas?|catalogos?|landing|login|dashboard|panel|calculadoras?|portafolios?|portfolio|pomodoro|temporizador(?:es)?|quiz(?:zes)?|trivias?|paletas?|gradientes?|blog|revista|noticias|formulario|formularios|reserva|cita|encuesta)\b/.test(
      norm,
    ) ||
    /\b(crea|genera|haz|hazme|dame|construye|arma|quiero)\b.*\b(todo|to-do|tareas|lista\s+de\s+tareas|kanban|cronometro|cuestionario|generador)\b/.test(
      norm,
    );
  if (wantsWeb) {
    if (/\b(login|iniciar\s+sesion|acceso|registro)\b/.test(norm)) {
      return {
        reply: buildHtmlResponse('Aquí tienes el `index.html` de inicio de sesión listo para copiar y previsualizar:', buildLoginIndexHtml(params), params.wantsCodeOnly),
        intent: 'code_index_login',
        confidence: 0.96,
      };
    }
    if (/\bcalculadora\b/.test(norm)) {
      return {
        reply: buildHtmlResponse('Aquí tienes una calculadora interactiva en un único `index.html`:', buildCalculatorIndexHtml(params), params.wantsCodeOnly),
        intent: 'code_index_calculator',
        confidence: 0.96,
      };
    }
    if (/\b(dashboard|panel)\b/.test(norm)) {
      return {
        reply: buildHtmlResponse('Generé este panel interactivo en `index.html` con filtro en tiempo real:', buildDashboardIndexHtml(params), params.wantsCodeOnly),
        intent: 'code_index_dashboard',
        confidence: 0.95,
      };
    }
    if (/\b(portafolio|portfolio|curriculum)\b/.test(norm)) {
      return {
        reply: buildHtmlResponse('Aquí tienes un `index.html` de portafolio profesional:', buildPortfolioIndexHtml(params), params.wantsCodeOnly),
        intent: 'code_index_portfolio',
        confidence: 0.95,
      };
    }

    const dynamicWeb = buildWebFromPrompt(params);
    if (dynamicWeb.html) {
      return {
        reply: buildHtmlResponse(dynamicWeb.description, dynamicWeb.html, params.wantsCodeOnly),
        intent: dynamicWeb.intent || 'code_index_dynamic_catalog',
        confidence: 0.96,
      };
    }

    if (/\b(crea|genera|haz|hazme|dame|construye|arma|quiero)\b/.test(norm) || params.topicSubject) {
      return {
        reply: buildHtmlResponse('Generé este `index.html` adaptado a tu solicitud:', buildLandingIndexHtml(params), params.wantsCodeOnly),
        intent: 'code_index_landing',
        confidence: 0.92,
      };
    }
  }

  // 6. Neural intent classification for greetings, ELARA info, Novvin & code guides
  const net = getIntentNetwork();
  const prediction = net.predict(latestUser);
  if (prediction.confidence >= 0.45) {
    switch (prediction.label) {
      case 'greeting_help':
        return {
          reply:
            '¡Hola! Soy **ELARA**. Dime qué necesitas y vamos directo a ello:\n\n- **Crear páginas y apps (`index.html`)** sobre cualquier tema (catálogos, laptops, comida, juguetes, **gestor de tareas**, **Pomodoro**, **trivia** o **paletas** — puedes pedir tema claro/oscuro, color y moneda `S/` o `$`).\n- **Utilidades rápidas**: convierte unidades (`km a millas`, `°C a °F`), colores (`#38bdf8` a RGB), genera **UUIDs / contraseñas** o calcula porcentajes.\n- **Guías y revisión de código**: React/TS, CSS Flexbox/Grid, Regex, REST/JWT, Python, SQL y análisis estático.',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'identity_elara':
        return {
          reply:
            'Soy **ELARA** (`E L A R A`), tu asistente web de programación y prototipado rápido.\n\nEn esta etapa corro con **Elara Core v0.4** (motor propio en el servidor para construir sitios `index.html` interactivos, utilidades de desarrollo y guías técnicas). Puedes conectar un modelo completo mediante `ELARA_UPSTREAM_URL`.',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'novvin_ecosystem':
        return {
          reply:
            'Puedes usar **ELARA** gratis sin login (hasta 20 mensajes en acceso libre). Para seguir sin límite o guardar tu perfil, pulsa **Continuar con Novvin** en la barra izquierda para crear tu nombre y `@usuario` (preparado para conectar con `novvinapp.com`).',
          intent: prediction.label,
          confidence: prediction.confidence,
        };
      case 'code_react_component':
      case 'code_js_ts_basics':
      case 'code_python_api':
      case 'code_sql_postgres':
      case 'code_git_deploy':
      case 'guide_css_layout':
      case 'guide_regex':
      case 'guide_http_auth':
      case 'guide_js_arrays': {
        const keyMap: Record<string, string> = {
          code_react_component: 'react_component',
          code_js_ts_basics: 'js_async_fetch',
          code_python_api: 'python_api',
          code_sql_postgres: 'sql_postgres',
          code_git_deploy: 'git_deploy',
          guide_css_layout: 'css_layout',
          guide_regex: 'regex_guide',
          guide_http_auth: 'http_auth',
          guide_js_arrays: 'js_arrays',
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

  // 7. Semantic keyword lookup over technical KB
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
    return { reply: bestArticle.answer, intent: `kb_${bestArticle.id}`, confidence: 0.68 };
  }

  // 8. Honest, specific fallback acknowledging what was asked without robotic wall of text
  const preview = latestUser.length > 72 ? `${latestUser.slice(0, 72)}…` : latestUser;
  return {
    reply: `No tengo suficiente contexto entrenado en **Elara Core v0.4** para responder directamente *"${preview}"* sin inventar información.\n\nSi quieres aprovechar lo que ya ejecuta en tiempo real, puedes pedirme:\n- *"Crea una web de 10 laptops gamer en color morado en soles"* o un **Blog**, **Formulario**, **Gestor de tareas**, **Pomodoro**, **Trivia** o **Login** en \`index.html\`.\n- Utilidades: *"Convierte 25 km a millas"*, *"Base64 de Hola ELARA"*, *"Timestamp actual"*, *"Formatea json { ... }"*, *"Genera un UUID"* o *"15% de 800"*.\n- Pegar o adjuntar un archivo de código para analizarlo.`,
    intent: '__fallback_honest__',
    confidence: prediction.confidence,
  };
}
