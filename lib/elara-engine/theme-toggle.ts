import {normalizeText} from './text';
import {readWebSpec} from './web-spec';

export function isThemeToggleRequest(raw:string):boolean {
 const text=normalizeText(raw);
 if(/\b(?:no|sin|evita)\b.{0,25}\b(?:boton|interruptor|switch)\b/.test(text))return false;
 return /\b(?:boton|interruptor|switch|alternar)\b/.test(text)&&/\b(?:tema|modo)\b/.test(text)&&(/\bclaro\b/.test(text)&&/\boscuro\b/.test(text)||/\bcambiar (?:de )?(?:tema|modo)\b/.test(text));
}

export function hasThemeToggle(html:string):boolean{return /<button\b[^>]*\bid=["']elara-theme-toggle["']/i.test(html);}

/** Preserve the original document; add one portable, keyboard-accessible control. */
export function addThemeToggle(html:string):string {
 if(hasThemeToggle(html))return html;
 const initial=readWebSpec(html).preferredTheme||(/--bg:\s*#(?:f8fafc|f7f8fc)/i.test(html)?'light':'dark');
 const style=`\n<style id="elara-theme-toggle-style">
:root[data-elara-theme="light"]{color-scheme:light;--bg:#f8fafc;--surface:#ffffff;--card:#ffffff;--border:#cbd5e1;--text:#0f172a;--muted:#475569;--accent-ink:#0f172a}
:root[data-elara-theme="dark"]{color-scheme:dark;--bg:#090d16;--surface:#111827;--card:#161f31;--border:#334155;--text:#f1f5f9;--muted:#b8c4d5;--accent-ink:#101018}
html[data-elara-theme] body{background-color:var(--bg);color:var(--text)}
#elara-theme-toggle{position:fixed;top:16px;right:16px;z-index:1000;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;max-width:calc(100vw - 24px);padding:10px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer;box-shadow:0 2px 12px #0002}
#elara-theme-toggle:focus-visible{outline:3px solid #7c6ef6;outline-offset:3px}
@media(max-width:480px){#elara-theme-toggle{top:12px;right:12px}}
</style>\n`;
 const button='\n<button type="button" id="elara-theme-toggle" aria-label="Cambiar tema">Cambiar tema</button>\n';
 const script=`<script id="elara-theme-toggle-script">
(()=>{const button=document.getElementById('elara-theme-toggle');if(!button)return;let theme=${JSON.stringify(initial)};
try{const saved=localStorage.getItem('elara:theme');if(saved==='dark'||saved==='light')theme=saved;}catch{}
function apply(){const dark=theme==='dark';document.documentElement.setAttribute('data-elara-theme',theme);button.textContent=dark?'☀ Modo claro':'☾ Modo oscuro';button.setAttribute('aria-label',dark?'Cambiar a modo claro':'Cambiar a modo oscuro');}
button.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';apply();try{localStorage.setItem('elara:theme',theme);}catch{}});apply();})();
</script>\n`;
 const head=html.toLowerCase().lastIndexOf('</head>');
 let result=head<0?style+html:html.slice(0,head)+style+html.slice(head);
 const body=result.toLowerCase().lastIndexOf('</body>');
 result=body<0?result+button+script:result.slice(0,body)+button+script+result.slice(body);
 return result;
}
