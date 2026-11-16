import type { PromptParams } from './text';

interface CatalogItem {
  name: string;
  category: string;
  price: string;
  description: string;
  badge: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCase(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase()))
    .join(' ');
}

function palette(theme: 'dark' | 'light', accentOverride?: string) {
  const accent = accentOverride || '#38bdf8';
  return theme === 'light'
    ? {
        bg: '#f8fafc',
        surface: '#ffffff',
        card: '#ffffff',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#475569',
        accent,
        accentInk: '#ffffff',
      }
    : {
        bg: '#090d16',
        surface: '#111827',
        card: '#161f31',
        border: '#253147',
        text: '#f1f5f9',
        muted: '#94a3b8',
        accent,
        accentInk: '#061018',
      };
}

const PET_TOYS_CATALOG: CatalogItem[] = [
  { name: 'Hueso Dental Menta Resistente', category: 'Mordedores', price: '$12.90', badge: 'Top ventas', description: 'Caucho natural texturizado que masajea encías y reduce sarro.' },
  { name: 'Pelota Dispensadora IQ', category: 'Interactivos', price: '$15.50', badge: 'Estimulación', description: 'Libera premios lentamente mientras tu perro rueda la esfera.' },
  { name: 'Cuerda Trenzada 3 Nudos XL', category: 'Mordedores', price: '$11.00', badge: 'Algodón 100%', description: 'Ideal para juegos de tira y afloja en razas medianas y grandes.' },
  { name: 'Peluche Pato Chirriador Suave', category: 'Peluches', price: '$14.20', badge: 'Con sonido', description: 'Felpa reforzada con doble costura y pito interno seguro.' },
  { name: 'Frisbee Flexible Todo Terreno', category: 'Exterior', price: '$13.50', badge: 'Flota en agua', description: 'Silicona blanda que cuida los dientes en atrapadas al vuelo.' },
  { name: 'Mordedor Frío para Cachorros', category: 'Mordedores', price: '$9.80', badge: 'Dentición', description: 'Se refrigera para aliviar molestias de crecimiento dental.' },
  { name: 'Alfombra Olfativa Bosque Verde', category: 'Interactivos', price: '$22.00', badge: 'Anti-estrés', description: 'Esconde croquetas entre pliegues de tela para estimular el olfato.' },
  { name: 'Zanahoria de Felpa Crujiente', category: 'Peluches', price: '$10.40', badge: 'Suave', description: 'Relleno con papel sonoro que mantiene la curiosidad activa.' },
  { name: 'Pelota Rebote Alta Visibilidad', category: 'Pelotas', price: '$8.90', badge: 'Neón', description: 'Goma elástica resistente fácil de localizar en césped o parque.' },
  { name: 'Rompecabezas Deslizante Nivel 2', category: 'Interactivos', price: '$24.50', badge: 'Mente activa', description: 'Tablero con compartimentos móviles para buscar recompensas.' },
  { name: 'Aro Flotador de Playa', category: 'Exterior', price: '$16.00', badge: 'Impermeable', description: 'Espuma EVA ligera visible en piscinas, lagos y playa.' },
  { name: 'Pulpo de Tentáculos Largos', category: 'Peluches', price: '$13.80', badge: 'Sin relleno', description: 'Menos desorden en casa y ocho patas perfectas para sacudir.' },
  { name: 'Mancuerna Rugby con Relieve', category: 'Mordedores', price: '$14.90', badge: 'Ultra duro', description: 'Diseñada para mordidas fuertes que destruyen juguetes comunes.' },
  { name: 'Lanzador Automático de Pelotas', category: 'Pelotas', price: '$18.40', badge: 'Largo alcance', description: 'Lanza a distancia sin ensuciar tus manos con baba o barro.' },
  { name: 'Conejo Cuerda y Látex', category: 'Peluches', price: '$11.90', badge: 'Mixto', description: 'Combina cuerpo blando con orejas de cuerda para jalar.' },
  { name: 'Botella Crackle Reutilizable', category: 'Interactivos', price: '$9.50', badge: 'Crujido', description: 'Funda lavable con sonido crujiente que encanta a perros jóvenes.' },
  { name: 'Disco Dentado Porta-Snacks', category: 'Mordedores', price: '$15.20', badge: 'Rellenable', description: 'Ranuras laterales para untar mantequilla de maní apta canina.' },
  { name: 'Set 3 Pelotas Mini Tenis', category: 'Pelotas', price: '$12.00', badge: 'Pack x3', description: 'Fieltro no abrasivo pensado para proteger el esmalte dental.' },
  { name: 'Túnel Plegable de Agilidad', category: 'Exterior', price: '$29.90', badge: 'Entrenamiento', description: 'Poliéster ligero con estacas y bolsa de transporte incluida.' },
  { name: 'Cojín Ardilla Con Escondite', category: 'Interactivos', price: '$19.90', badge: 'Favorito', description: 'Incluye 3 mini ardillas sacables del tronco para juego continuo.' },
  { name: 'Bola Luminosa Nocturna LED', category: 'Pelotas', price: '$16.50', badge: 'Paseo noche', description: 'Se ilumina al rebotar para jugar seguro al anochecer.' },
  { name: 'Oso Koala Ultra Suave', category: 'Peluches', price: '$14.00', badge: 'Descanso', description: 'Compañero de siesta ligero ideal para cachorros recién llegados.' },
  { name: 'Llanta de Caucho Reforzado', category: 'Mordedores', price: '$17.80', badge: 'Raza grande', description: 'Neumático macizo no tóxico pensado para horas de mordida.' },
  { name: 'Tapete Lamedor Ventosas', category: 'Interactivos', price: '$11.60', badge: 'Calma', description: 'Se adhiere al piso o pared durante el baño para relajarlo.' },
];

const FOOD_CATALOG: CatalogItem[] = [
  { name: 'Hamburguesa Smash Doble', category: 'Principales', price: '$11.50', badge: 'Casa', description: 'Pan brioche artesanal, doble carne sellada y queso cheddar fundido.' },
  { name: 'Pizza Margherita Masa Madre', category: 'Horno', price: '$13.90', badge: 'Clásica', description: 'Tomate triturado italiano, mozzarella fresca y albahaca.' },
  { name: 'Tacos al Pastor x3', category: 'Antojos', price: '$9.20', badge: 'Popular', description: 'Cerdo marinado en achiote, piña asada y salsa verde fresca.' },
  { name: 'Bowls Salmón & Aguacate', category: 'Saludable', price: '$14.40', badge: 'Fresco', description: 'Arroz sushi, láminas de salmón, edamame y sésamo tostado.' },
  { name: 'Pasta Alfredo Trufada', category: 'Horno', price: '$12.80', badge: 'Chef', description: 'Fettuccine cremoso con parmesano estacionado y toque de trufa.' },
  { name: 'Papas Bravas Crujientes', category: 'Entradas', price: '$6.50', badge: 'Para compartir', description: 'Doble fritura con alioli de ajo asado y pimentón ahumado.' },
  { name: 'Ceviche Clásico del Día', category: 'Fresco', price: '$13.50', badge: 'Recomendado', description: 'Pesca fresca marinada al momento en limón sutil, camote y choclo.' },
  { name: 'Limonada de Hierbabuena', category: 'Bebidas', price: '$4.20', badge: 'Natural', description: 'Exprimida al instante con hielo frappé y hojas frescas.' },
  { name: 'Cold Brew Vainilla', category: 'Bebidas', price: '$4.80', badge: 'Café', description: 'Extracción lenta de 16 horas con notas dulces naturales.' },
  { name: 'Cheesecake de Maracuyá', category: 'Postres', price: '$6.90', badge: 'Dulce', description: 'Base crocante de galleta y reducción ácida de fruta fresca.' },
];

function buildGenericTopicItems(subject: string, count: number): CatalogItem[] {
  const clean = subject.replace(/^(?:de|sobre|para)\s+/i, '').trim() || 'Colección';
  const categories = ['Destacados', 'Esenciales', 'Novedades', 'Premium'];
  const badges = ['Recomendado', 'Popular', 'Nuevo', 'Edición Pro'];
  const verbs = [
    'Edición Clásica',
    'Modelo Compacto',
    'Versión Pro',
    'Pack Inicial',
    'Diseño Minimalista',
    'Serie Urbana',
    'Edición Especial',
    'Kit Completo',
    'Formato Ligero',
    'Línea Premium',
  ];
  const items: CatalogItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const label = titleCase(clean.replace(/^\d+\s+/, ''));
    const variant = verbs[i % verbs.length];
    items.push({
      name: `${label} — ${variant} #${i + 1}`,
      category: categories[i % categories.length],
      price: `$${(12 + ((i * 7) % 45)).toFixed(2)}`,
      badge: badges[i % badges.length],
      description: `Opción seleccionada dentro de ${clean}, lista para personalizar precio, foto y detalles.`,
    });
  }
  return items;
}

function selectCatalogItems(params: PromptParams): {
  title: string;
  subtitle: string;
  accent: string;
  items: CatalogItem[];
} {
  const norm = params.normalized;
  const count = params.requestedCount ?? (/\b20\b/.test(norm) ? 20 : 12);

  if (/(perrit|perr[oa]|mascot|cachorr|juguete.*perr|canin|pet)/.test(norm)) {
    const picked: CatalogItem[] = [];
    for (let i = 0; i < count; i += 1) {
      const base = PET_TOYS_CATALOG[i % PET_TOYS_CATALOG.length];
      picked.push(
        i < PET_TOYS_CATALOG.length
          ? base
          : { ...base, name: `${base.name} (Edición ${i + 1})` },
      );
    }
    return {
      title: params.brandName || `Tienda Canina · ${picked.length} Juguetes para Perritos`,
      subtitle: 'Catálogo interactivo con búsqueda, filtro por tipo y carrito funcional en vivo.',
      accent: '#f59e0b',
      items: picked,
    };
  }

  if (/(restaurante|menu|comida|pizza|cafe|cafeteria|hamburguesa|cocina|postre)/.test(norm)) {
    const picked: CatalogItem[] = [];
    for (let i = 0; i < count; i += 1) {
      const base = FOOD_CATALOG[i % FOOD_CATALOG.length];
      picked.push(i < FOOD_CATALOG.length ? base : { ...base, name: `${base.name} #${i + 1}` });
    }
    return {
      title: params.brandName || titleCase(params.topicSubject || 'Carta & Pedidos en Línea'),
      subtitle: 'Menú digital interactivo con categorías, buscador y pedido rápido.',
      accent: '#fb7185',
      items: picked,
    };
  }

  const subject = params.topicSubject || params.raw.replace(/^(crea|genera|hazme|haz|dame)\s+/i, '').slice(0, 50);
  return {
    title: params.brandName || titleCase(subject),
    subtitle: `Catálogo dinámico generado con ${count} elementos interactivos filtrables.`,
    accent: '#38bdf8',
    items: buildGenericTopicItems(subject, count),
  };
}

export function buildCatalogStoreHtml(params: PromptParams): string {
  const { title, subtitle, accent, items } = selectCatalogItems(params);
  const c = palette(params.preferredTheme, accent);
  const categories = ['Todos', ...Array.from(new Set(items.map((x) => x.category)))];
  const serializedItems = JSON.stringify(items);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --accent-ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    .container { max-width: 1120px; margin: 0 auto; padding: 24px 20px 64px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    h1 { font-size: clamp(1.5rem, 3vw, 2.15rem); letter-spacing: -0.02em; }
    .sub { color: var(--muted); font-size: 0.95rem; margin-top: 4px; }
    .cart-pill { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
    .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin: 22px 0; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: var(--surface); color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 7px 14px; font-size: 0.85rem; cursor: pointer; }
    .chip.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
    input[type="search"] { background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 9px 14px; min-width: 240px; font-size: 0.92rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
    .tag { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: rgba(148,163,184,0.14); color: var(--accent); width: fit-content; }
    .card h3 { font-size: 1rem; margin-top: 6px; }
    .card p { font-size: 0.87rem; color: var(--muted); margin-top: 4px; }
    .card-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); }
    .price { font-weight: 700; font-size: 1.05rem; }
    .add { background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 8px; padding: 6px 12px; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
    .add:hover { background: var(--accent); color: var(--accent-ink); }
    .summary { margin-top: 28px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: none; }
    .summary.open { display: block; }
    .summary ul { list-style: none; margin: 12px 0; display: grid; gap: 6px; }
    .summary li { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="sub">${escapeHtml(subtitle)}</p>
      </div>
      <button type="button" class="cart-pill" id="cartToggle">Carrito (<span id="cartCount">0</span>) · <span id="cartTotal">$0.00</span></button>
    </header>

    <div class="controls">
      <div class="chips" id="categoryBar">
        ${categories.map((cat, idx) => `<button type="button" class="chip${idx === 0 ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
      </div>
      <input id="searchInput" type="search" placeholder="Buscar entre ${items.length} opciones..." />
    </div>

    <main class="grid" id="catalogGrid"></main>

    <section class="summary" id="cartPanel">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>Tu pedido (<span id="panelCount">0</span> artículos)</strong>
        <button type="button" class="chip" id="clearCart">Vaciar</button>
      </div>
      <ul id="cartItems"></ul>
    </section>
  </div>

  <script>
    const ITEMS = ${serializedItems};
    let activeCat = 'Todos';
    let query = '';
    const cart = [];
    const grid = document.getElementById('catalogGrid');

    function updateCartUI() {
      const total = cart.reduce((acc, item) => acc + parseFloat(item.price.replace('$', '')), 0);
      document.getElementById('cartCount').textContent = String(cart.length);
      document.getElementById('panelCount').textContent = String(cart.length);
      document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
      const list = document.getElementById('cartItems');
      list.replaceChildren();
      cart.forEach((item, idx) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = (idx + 1) + '. ' + item.name;
        const priceSpan = document.createElement('strong');
        priceSpan.textContent = item.price;
        li.append(nameSpan, priceSpan);
        list.appendChild(li);
      });
    }

    function renderGrid() {
      grid.replaceChildren();
      const filtered = ITEMS.filter((item) => {
        const matchCat = activeCat === 'Todos' || item.category === activeCat;
        const q = query.toLowerCase();
        const matchText = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        return matchCat && matchText;
      });
      filtered.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'card';
        const top = document.createElement('div');
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = item.category + ' · ' + item.badge;
        const h3 = document.createElement('h3');
        h3.textContent = (index + 1) + '. ' + item.name;
        const p = document.createElement('p');
        p.textContent = item.description;
        top.append(tag, h3, p);

        const foot = document.createElement('div');
        foot.className = 'card-foot';
        const price = document.createElement('span');
        price.className = 'price';
        price.textContent = item.price;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'add';
        btn.textContent = 'Agregar';
        btn.addEventListener('click', () => {
          cart.push(item);
          updateCartUI();
          document.getElementById('cartPanel').classList.add('open');
        });
        foot.append(price, btn);
        card.append(top, foot);
        grid.appendChild(card);
      });
    }

    document.getElementById('categoryBar').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      activeCat = btn.dataset.cat;
      document.querySelectorAll('.chip[data-cat]').forEach((el) => el.classList.toggle('active', el === btn));
      renderGrid();
    });
    document.getElementById('searchInput').addEventListener('input', (e) => {
      query = e.target.value;
      renderGrid();
    });
    document.getElementById('cartToggle').addEventListener('click', () => {
      document.getElementById('cartPanel').classList.toggle('open');
    });
    document.getElementById('clearCart').addEventListener('click', () => {
      cart.length = 0;
      updateCartUI();
    });
    renderGrid();
  </script>
</body>
</html>`;
}

export function buildWebFromPrompt(params: PromptParams): { description: string; html: string } {
  const norm = params.normalized;
  if (
    params.requestedCount != null ||
    /(tienda|catalogo|productos|juguetes|perrit|mascot|menu|comida|restaurante|ropa|zapatos|recetas|servicios|cursos|galeria|lista\s+de)/.test(norm)
  ) {
    const info = selectCatalogItems(params);
    return {
      description: `Generé un \`index.html\` completo para **${info.title}** con **${info.items.length} elementos reales**, buscador en vivo, filtro por categorías y carrito interactivo:`,
      html: buildCatalogStoreHtml(params),
    };
  }

  return {
    description: '',
    html: '',
  };
}
