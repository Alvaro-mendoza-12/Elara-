import type { PromptParams } from './text';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function palette(theme: 'dark' | 'light') {
  return theme === 'light'
    ? {
        bg: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#475569',
        accent: '#0284c7',
      }
    : {
        bg: '#0b0e14',
        surface: '#121826',
        border: '#232c40',
        text: '#f1f5f9',
        muted: '#94a3b8',
        accent: '#38bdf8',
      };
}

export function buildLandingIndexHtml(params: PromptParams): string {
  const subject = params.topicSubject ? params.topicSubject.trim() : null;
  const brand = escapeHtml(params.brandName || (subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : 'Mi Sitio Web'));
  const headline = subject
    ? escapeHtml(`Bienvenido a ${subject}`)
    : `Construye tu proyecto web con ${brand}`;
  const subtitle = subject
    ? escapeHtml(`Página de inicio diseñada para presentar ${subject} de forma clara, moderna y adaptable a cualquier pantalla.`)
    : `Plantilla index.html moderna, adaptable a móviles y lista para personalizar con tu contenido.`;
  const c = palette(params.preferredTheme);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} — Inicio</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px; }
    header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 40px; }
    .brand { font-weight: 700; font-size: 1.15rem; letter-spacing: 0.04em; color: var(--accent); }
    nav { display: flex; gap: 18px; align-items: center; }
    nav a { color: var(--muted); text-decoration: none; font-size: 0.95rem; }
    nav a:hover { color: var(--text); }
    .btn { background: var(--accent); color: #081018; border: 0; border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
    .hero { padding: 48px 0; display: grid; gap: 20px; max-width: 680px; }
    .hero h1 { font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.15; letter-spacing: -0.02em; }
    .hero p { color: var(--muted); font-size: 1.05rem; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    .ghost { background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 10px 18px; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 36px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
    .card h3 { font-size: 1.05rem; margin-bottom: 6px; }
    .card p { color: var(--muted); font-size: 0.92rem; }
    #status { margin-top: 12px; font-size: 0.9rem; color: var(--accent); min-height: 1.4em; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <span class="brand">${brand}</span>
      <nav>
        <a href="#funciones">Servicios</a>
        <a href="#contacto">Contacto</a>
        <button class="btn" id="ctaBtn" type="button">Empezar ahora</button>
      </nav>
    </header>

    <main class="hero">
      <h1>${headline}</h1>
      <p>${subtitle}</p>
      <div class="actions">
        <button class="btn" id="demoBtn" type="button">Explorar ahora</button>
        <button class="ghost" id="toggleBtn" type="button">Más información</button>
      </div>
      <div id="status" role="status"></div>
    </main>

    <section class="grid" id="funciones">
      <article class="card">
        <h3>Sección principal</h3>
        <p>Presenta los puntos fuertes de ${brand} con jerarquía visual limpia.</p>
      </article>
      <article class="card">
        <h3>Adaptable a móvil</h3>
        <p>Se ajusta automáticamente a pantallas de escritorio, tablet y Android.</p>
      </article>
      <article class="card" id="contacto">
        <h3>Contacto directo</h3>
        <p>Listo para conectar tus formularios, enlaces o redes sociales.</p>
      </article>
    </section>
  </div>
  <script>
    const statusEl = document.getElementById('status');
    let clicks = 0;
    document.getElementById('ctaBtn').addEventListener('click', () => {
      statusEl.textContent = 'Bienvenido a ${brand}.';
    });
    document.getElementById('demoBtn').addEventListener('click', () => {
      clicks += 1;
      statusEl.textContent = 'Interacción registrada (' + clicks + ') en ${brand}.';
    });
    document.getElementById('toggleBtn').addEventListener('click', () => {
      statusEl.textContent = 'Puedes editar textos y colores en el código index.html.';
    });
  </script>
</body>
</html>`;
}

export function buildLoginIndexHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Novvin / Elara');
  const c = palette(params.preferredTheme);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acceder — ${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .panel { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; display: grid; gap: 16px; }
    h1 { font-size: 1.45rem; }
    .sub { color: var(--muted); font-size: 0.92rem; }
    label { display: grid; gap: 6px; font-size: 0.88rem; color: var(--muted); }
    input { padding: 11px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.95rem; }
    .primary { background: var(--accent); color: #061018; border: 0; border-radius: 10px; padding: 11px; font-weight: 600; cursor: pointer; }
    .secondary { background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 11px; font-weight: 500; cursor: pointer; }
    .divider { text-align: center; color: var(--muted); font-size: 0.8rem; }
    #feedback { font-size: 0.88rem; color: var(--accent); min-height: 1.3em; }
  </style>
</head>
<body>
  <main class="panel">
    <div>
      <h1>Iniciar sesión en ${brand}</h1>
      <p class="sub">Accede con tus credenciales o continúa sin cuenta en modo invitado.</p>
    </div>
    <form id="loginForm" style="display:grid;gap:12px;">
      <label>Correo electrónico
        <input id="email" type="email" required placeholder="tu@correo.com" />
      </label>
      <label>Contraseña
        <input id="password" type="password" required minlength="6" placeholder="••••••••" />
      </label>
      <button class="primary" type="submit">Entrar</button>
    </form>
    <div class="divider">o acceso rápido</div>
    <button class="secondary" id="novvinBtn" type="button">Continuar con Novvin</button>
    <button class="secondary" id="guestBtn" type="button">Entrar como invitado</button>
    <p id="feedback" role="status"></p>
  </main>
  <script>
    const feedback = document.getElementById('feedback');
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      feedback.textContent = 'Validación local superada para ' + email + '. Conecta aquí tu endpoint /auth.';
    });
    document.getElementById('novvinBtn').addEventListener('click', () => {
      feedback.textContent = 'Flujo OAuth previsto: abrir autorización en Novvin Web / App y volver con token.';
    });
    document.getElementById('guestBtn').addEventListener('click', () => {
      feedback.textContent = 'Sesión de invitado lista sin registro.';
    });
  </script>
</body>
</html>`;
}

export function buildDashboardIndexHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Elara Panel');
  const c = palette(params.preferredTheme);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} — Panel</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
    .wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 20px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    input { padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .stat small { color: var(--muted); display: block; }
    .stat strong { font-size: 1.5rem; color: var(--accent); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 0.92rem; }
    th { color: var(--muted); font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <h1>Panel de ${brand}</h1>
      <input id="filter" type="search" placeholder="Filtrar módulos..." />
    </header>
    <section class="stats">
      <div class="stat"><small>Estado</small><strong>En línea</strong></div>
      <div class="stat"><small>Consultas hoy</small><strong id="countStat">128</strong></div>
      <div class="stat"><small>Latencia media</small><strong>42 ms</strong></div>
    </section>
    <table>
      <thead><tr><th>Módulo</th><th>Tipo</th><th>Estado</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <script>
    const items = [
      { name: 'Chat Principal', type: 'Web UI', state: 'Activo' },
      { name: 'Generador HTML index', type: 'Código', state: 'Listo' },
      { name: 'Conector Novvin', type: 'OAuth (Pronto)', state: 'En diseño' },
      { name: 'Motor Servidor', type: 'API /v1', state: 'Configurable' },
    ];
    const tbody = document.getElementById('rows');
    function render(term) {
      tbody.replaceChildren();
      const q = term.toLowerCase();
      items.filter(x => x.name.toLowerCase().includes(q) || x.type.toLowerCase().includes(q)).forEach(item => {
        const tr = document.createElement('tr');
        [item.name, item.type, item.state].forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    document.getElementById('filter').addEventListener('input', (e) => render(e.target.value));
    render('');
  </script>
</body>
</html>`;
}

export function buildCalculatorIndexHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Calculadora Elara');
  const c = palette(params.preferredTheme);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --accent: ${c.accent}; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
    .calc { width: 310px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 18px; display: grid; gap: 12px; }
    .screen { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: right; font-size: 1.7rem; font-family: ui-monospace, monospace; overflow-x: auto; }
    .keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    button { padding: 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 1.05rem; cursor: pointer; }
    button.op { color: var(--accent); font-weight: 600; }
    button.eq { background: var(--accent); color: #081018; font-weight: 700; grid-column: span 2; }
  </style>
</head>
<body>
  <main class="calc">
    <div class="screen" id="display">0</div>
    <div class="keys" id="keys"></div>
  </main>
  <script>
    const buttons = ['C','(',')','/','7','8','9','*','4','5','6','-','1','2','3','+','0','.','='];
    const display = document.getElementById('display');
    const keys = document.getElementById('keys');
    let expr = '';
    function evalSafe(raw) {
      if (!/^[0-9+\\-*/().\\s]+$/.test(raw)) throw new Error('Expresión inválida');
      return Function('"use strict";return (' + raw + ')')();
    }
    buttons.forEach(label => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if ('/*-+()'.includes(label)) btn.className = 'op';
      if (label === '=') btn.className = 'eq';
      btn.addEventListener('click', () => {
        if (label === 'C') { expr = ''; display.textContent = '0'; return; }
        if (label === '=') {
          try { expr = String(evalSafe(expr || '0')); display.textContent = expr; }
          catch { display.textContent = 'Error'; expr = ''; }
          return;
        }
        expr += label;
        display.textContent = expr;
      });
      keys.appendChild(btn);
    });
  </script>
</body>
</html>`;
}

export function buildPortfolioIndexHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Portafolio Web');
  const c = palette(params.preferredTheme);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); max-width: 840px; margin: 0 auto; padding: 36px 20px; display: grid; gap: 32px; }
    h1 { font-size: 2.2rem; }
    p { color: var(--muted); line-height: 1.6; }
    .projects { display: grid; gap: 14px; }
    .item { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .item strong { color: var(--accent); display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <header>
    <h1>${brand}</h1>
    <p>Desarrollador full-stack enfocado en aplicaciones móviles Android, arquitecturas web modernas e inteligencia artificial.</p>
  </header>
  <section class="projects">
    <h2>Proyectos destacados</h2>
    <article class="item">
      <strong>Plataforma Web & Móvil</strong>
      <p>Interfaz en tiempo real, streaming de datos y despliegue continuo en la nube.</p>
    </article>
    <article class="item">
      <strong>Asistente ELARA</strong>
      <p>Interfaz conversacional con vista previa instantánea de código e integración modular.</p>
    </article>
  </section>
</body>
</html>`;
}
