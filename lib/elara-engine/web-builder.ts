import { serializeWebSpec } from './web-spec';
import { resolveThemePalette } from './code-synthesizer';
import { normalizeText, type PromptParams } from './text';

interface CatalogSeed {
  name: string;
  category: string;
  priceValue: number;
  description: string;
  badge: string;
}

interface CatalogItem extends CatalogSeed {
  price: string;
}

interface DomainPreset {
  id: string;
  pattern: RegExp;
  defaultTitle: string;
  subtitle: string;
  defaultAccent: string;
  items: CatalogSeed[];
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

function formatMoney(value: number, currency: string): string {
  return `${currency === 'S/' ? 'S/ ' : currency}${value.toFixed(2)}`;
}

const DOMAIN_PRESETS: DomainPreset[] = [
  {
    id: 'pets',
    pattern: /(perrit|perr[oa]|mascot|cachorr|juguete.*perr|canin|pet)/,
    defaultTitle: 'Tienda Canina · Juguetes para Perritos',
    subtitle: 'Catálogo interactivo con búsqueda, filtro por tipo y carrito funcional en vivo.',
    defaultAccent: '#f59e0b',
    items: [
      { name: 'Hueso Dental Menta Resistente', category: 'Mordedores', priceValue: 12.9, badge: 'Top ventas', description: 'Caucho natural texturizado que masajea encías y reduce sarro.' },
      { name: 'Pelota Dispensadora IQ', category: 'Interactivos', priceValue: 15.5, badge: 'Estimulación', description: 'Libera premios lentamente mientras tu perro rueda la esfera.' },
      { name: 'Cuerda Trenzada 3 Nudos XL', category: 'Mordedores', priceValue: 11.0, badge: 'Algodón 100%', description: 'Ideal para juegos de tira y afloja en razas medianas y grandes.' },
      { name: 'Peluche Pato Chirriador Suave', category: 'Peluches', priceValue: 14.2, badge: 'Con sonido', description: 'Felpa reforzada con doble costura y pito interno seguro.' },
      { name: 'Frisbee Flexible Todo Terreno', category: 'Exterior', priceValue: 13.5, badge: 'Flota en agua', description: 'Silicona blanda que cuida los dientes en atrapadas al vuelo.' },
      { name: 'Mordedor Frío para Cachorros', category: 'Mordedores', priceValue: 9.8, badge: 'Dentición', description: 'Se refrigera para aliviar molestias de crecimiento dental.' },
      { name: 'Alfombra Olfativa Bosque Verde', category: 'Interactivos', priceValue: 22.0, badge: 'Anti-estrés', description: 'Esconde croquetas entre pliegues de tela para estimular el olfato.' },
      { name: 'Zanahoria de Felpa Crujiente', category: 'Peluches', priceValue: 10.4, badge: 'Suave', description: 'Relleno con papel sonoro que mantiene la curiosidad activa.' },
      { name: 'Pelota Rebote Alta Visibilidad', category: 'Pelotas', priceValue: 8.9, badge: 'Neón', description: 'Goma elástica resistente fácil de localizar en césped o parque.' },
      { name: 'Rompecabezas Deslizante Nivel 2', category: 'Interactivos', priceValue: 24.5, badge: 'Mente activa', description: 'Tablero con compartimentos móviles para buscar recompensas.' },
      { name: 'Aro Flotador de Playa', category: 'Exterior', priceValue: 16.0, badge: 'Impermeable', description: 'Espuma EVA ligera visible en piscinas, lagos y playa.' },
      { name: 'Pulpo de Tentáculos Largos', category: 'Peluches', priceValue: 13.8, badge: 'Sin relleno', description: 'Menos desorden en casa y ocho patas perfectas para sacudir.' },
      { name: 'Mancuerna Rugby con Relieve', category: 'Mordedores', priceValue: 14.9, badge: 'Ultra duro', description: 'Diseñada para mordidas fuertes que destruyen juguetes comunes.' },
      { name: 'Lanzador Automático de Pelotas', category: 'Pelotas', priceValue: 18.4, badge: 'Largo alcance', description: 'Lanza a distancia sin ensuciar tus manos con baba o barro.' },
      { name: 'Conejo Cuerda y Látex', category: 'Peluches', priceValue: 11.9, badge: 'Mixto', description: 'Combina cuerpo blando con orejas de cuerda para jalar.' },
      { name: 'Botella Crackle Reutilizable', category: 'Interactivos', priceValue: 9.5, badge: 'Crujido', description: 'Funda lavable con sonido crujiente que encanta a perros jóvenes.' },
      { name: 'Disco Dentado Porta-Snacks', category: 'Mordedores', priceValue: 15.2, badge: 'Rellenable', description: 'Ranuras laterales para untar mantequilla de maní apta canina.' },
      { name: 'Set 3 Pelotas Mini Tenis', category: 'Pelotas', priceValue: 12.0, badge: 'Pack x3', description: 'Fieltro no abrasivo pensado para proteger el esmalte dental.' },
      { name: 'Túnel Plegable de Agilidad', category: 'Exterior', priceValue: 29.9, badge: 'Entrenamiento', description: 'Poliéster ligero con estacas y bolsa de transporte incluida.' },
      { name: 'Cojín Ardilla Con Escondite', category: 'Interactivos', priceValue: 19.9, badge: 'Favorito', description: 'Incluye 3 mini ardillas sacables del tronco para juego continuo.' },
      { name: 'Bola Luminosa Nocturna LED', category: 'Pelotas', priceValue: 16.5, badge: 'Paseo noche', description: 'Se ilumina al rebotar para jugar seguro al anochecer.' },
      { name: 'Oso Koala Ultra Suave', category: 'Peluches', priceValue: 14.0, badge: 'Descanso', description: 'Compañero de siesta ligero ideal para cachorros recién llegados.' },
      { name: 'Llanta de Caucho Reforzado', category: 'Mordedores', priceValue: 17.8, badge: 'Raza grande', description: 'Neumático macizo no tóxico pensado para horas de mordida.' },
      { name: 'Tapete Lamedor Ventosas', category: 'Interactivos', priceValue: 11.6, badge: 'Calma', description: 'Se adhiere al piso o pared durante el baño para relajarlo.' },
    ],
  },
  {
    id: 'food',
    pattern: /(restaurante|menu|comida|pizza|cafe|cafeteria|hamburguesa|cocina|postre)/,
    defaultTitle: 'Carta & Pedidos en Línea',
    subtitle: 'Menú digital interactivo con categorías, buscador y pedido rápido.',
    defaultAccent: '#fb7185',
    items: [
      { name: 'Hamburguesa Smash Doble', category: 'Principales', priceValue: 11.5, badge: 'Casa', description: 'Pan brioche artesanal, doble carne sellada y queso cheddar fundido.' },
      { name: 'Pizza Margherita Masa Madre', category: 'Horno', priceValue: 13.9, badge: 'Clásica', description: 'Tomate triturado italiano, mozzarella fresca y albahaca.' },
      { name: 'Tacos al Pastor x3', category: 'Antojos', priceValue: 9.2, badge: 'Popular', description: 'Cerdo marinado en achiote, piña asada y salsa verde fresca.' },
      { name: 'Bowl Salmón & Aguacate', category: 'Saludable', priceValue: 14.4, badge: 'Fresco', description: 'Arroz sushi, láminas de salmón, edamame y sésamo tostado.' },
      { name: 'Pasta Alfredo Trufada', category: 'Horno', priceValue: 12.8, badge: 'Chef', description: 'Fettuccine cremoso con parmesano estacionado y toque de trufa.' },
      { name: 'Papas Bravas Crujientes', category: 'Entradas', priceValue: 6.5, badge: 'Compartir', description: 'Doble fritura con alioli de ajo asado y pimentón ahumado.' },
      { name: 'Ceviche Clásico del Día', category: 'Fresco', priceValue: 13.5, badge: 'Recomendado', description: 'Pesca fresca marinada al momento en limón sutil, camote y choclo.' },
      { name: 'Limonada de Hierbabuena', category: 'Bebidas', priceValue: 4.2, badge: 'Natural', description: 'Exprimida al instante con hielo frappé y hojas frescas.' },
      { name: 'Cold Brew Vainilla', category: 'Bebidas', priceValue: 4.8, badge: 'Café', description: 'Extracción lenta de 16 horas con notas dulces naturales.' },
      { name: 'Cheesecake de Maracuyá', category: 'Postres', priceValue: 6.9, badge: 'Dulce', description: 'Base crocante de galleta y reducción ácida de fruta fresca.' },
    ],
  },
  {
    id: 'tech',
    pattern: /(laptop|computador|pc\b|gamer|tecnolog|celular|movil|gadget|teclado|monitor|auricular|hardware|electronic)/,
    defaultTitle: 'TechHub · Catálogo Hardware & Gaming',
    subtitle: 'Equipos y periféricos seleccionados con especificaciones clave y carrito en vivo.',
    defaultAccent: '#38bdf8',
    items: [
      { name: 'Laptop ProBook 16 Ryzen 7', category: 'Laptops', priceValue: 980.0, badge: '16GB RAM', description: 'Pantalla IPS 16", SSD NVMe 1TB y chasis metálico ultraligero.' },
      { name: 'Laptop Gamer Pulse RTX 4060', category: 'Laptops', priceValue: 1290.0, badge: '144 Hz', description: 'Gráfica dedicada 8GB, refrigeración doble y teclado RGB por zonas.' },
      { name: 'Monitor Curvo 27" QHD 165Hz', category: 'Monitores', priceValue: 315.0, badge: '1 ms', description: 'Panel VA calibrado con FreeSync y soporte regulable en altura.' },
      { name: 'Teclado Mecánico 75% Hot-Swap', category: 'Periféricos', priceValue: 84.0, badge: 'Switches Tactil', description: 'Cable USB-C desmontable, keycaps PBT y estructura gasket mount.' },
      { name: 'Mouse Inalámbrico Ultraligero 54g', category: 'Periféricos', priceValue: 68.0, badge: '26K DPI', description: 'Batería de 70 horas y receptor 2.4 GHz de baja latencia.' },
      { name: 'Audífonos Studio ANC USB-C', category: 'Audio', priceValue: 112.0, badge: 'Cancelación', description: 'Drivers de 40mm con micrófono claro para llamadas y edición.' },
      { name: 'SSD NVMe Gen4 2TB', category: 'Componentes', priceValue: 149.0, badge: '7300 MB/s', description: 'Almacenamiento ultrarrápido con disipador de aluminio incluido.' },
      { name: 'Dock Multipuerto 9-en-1 4K', category: 'Accesorios', priceValue: 46.0, badge: 'PD 100W', description: 'HDMI 4K 60Hz, Ethernet Gigabit, lector SD y carga rápida.' },
      { name: 'Webcam Full HD 60fps Enfoque Pro', category: 'Streaming', priceValue: 74.0, badge: '1080p60', description: 'Doble micrófono estéreo y tapa física de privacidad integrada.' },
      { name: 'Micrófono Cardioide USB Studio', category: 'Audio', priceValue: 92.0, badge: 'Podcast', description: 'Base antivibración, ganancia frontal y monitoreo sin latencia.' },
      { name: 'Silla Ergonómica Malla Pro', category: 'Setup', priceValue: 239.0, badge: 'Soporte lumbar', description: 'Respaldo transpirable reclinable a 135° y brazos ajustables 3D.' },
      { name: 'Kit Pasta Térmica + Aire Comprimido', category: 'Accesorios', priceValue: 19.5, badge: 'Mantenimiento', description: 'Todo lo necesario para bajar temperaturas en laptops y PCs.' },
    ],
  },
  {
    id: 'fashion',
    pattern: /(ropa|zapatilla|zapato|moda|polera|camisa|outfit|tienda.*ropa|vestid|calzado)/,
    defaultTitle: 'Atelier Urbano · Moda & Calzado',
    subtitle: 'Colección interactiva por categorías con buscador rápido y bolsa de compra.',
    defaultAccent: '#ec4899',
    items: [
      { name: 'Zapatillas Running CloudPace', category: 'Calzado', priceValue: 79.0, badge: 'Ligeras', description: 'Entresuela amortiguada y malla respirable para uso diario o trote.' },
      { name: 'Polera Oversize Algodón Pima', category: 'Superiores', priceValue: 34.0, badge: '100% Pima', description: 'Corte relajado de 260gsm con cuello acanalado resistente.' },
      { name: 'Casaca Denim Lavado Medio', category: 'Abrigos', priceValue: 64.0, badge: 'Clásica', description: 'Mezclilla estructurada con bolsillos interiores y costuras reforzadas.' },
      { name: 'Pantalón Cargo Ripstop Stretch', category: 'Inferiores', priceValue: 49.0, badge: 'Urbano', description: 'Tela flexible anti-desgarro con ajuste cómodo en tobillo.' },
      { name: 'Camisa Lino Manga Larga', category: 'Superiores', priceValue: 42.0, badge: 'Fresca', description: 'Mezcla lino-algodón ideal para climas templados y oficina casual.' },
      { name: 'Zapatillas Blancas Corte Retro', category: 'Calzado', priceValue: 68.0, badge: 'Top ventas', description: 'Suela cosida antiderrapante y plantilla viscoelástica cómoda.' },
      { name: 'Hoodie Minimalista Heavyweight', category: 'Abrigos', priceValue: 54.0, badge: 'Térmico', description: 'Interior afranelado suave y capucha doble sin cordones.' },
      { name: 'Gorra Visera Curva Twill', category: 'Accesorios', priceValue: 18.0, badge: 'Ajustable', description: 'Broche metálico trasero y bordado tonal discreto.' },
      { name: 'Mochila Urbana 22L Impermeable', category: 'Accesorios', priceValue: 44.0, badge: 'Porta Laptop', description: 'Compartimento acolchado para portátil de hasta 16 pulgadas.' },
      { name: 'Pack x3 Medias Técnicas Deportivas', category: 'Accesorios', priceValue: 14.5, badge: 'Pack x3', description: 'Refuerzo en talón y arco elástico transpirable.' },
    ],
  },
  {
    id: 'fitness',
    pattern: /(gym|gimnasio|fitness|suplemento|proteina|pesa|deporte|entrenamiento)/,
    defaultTitle: 'PulseFit · Equipamiento & Nutrición',
    subtitle: 'Rutinas, suplementos y accesorios deportivos listos para armar tu pedido.',
    defaultAccent: '#10b981',
    items: [
      { name: 'Proteína Whey Isolate 2 lb', category: 'Suplementos', priceValue: 58.0, badge: '27g prot.', description: 'Fácil disolución sabor chocolate belga sin azúcares añadidos.' },
      { name: 'Creatina Monohidratada Micronizada 300g', category: 'Suplementos', priceValue: 29.0, badge: 'Pura 100%', description: '60 servicios sin sabor para fuerza y recuperación muscular.' },
      { name: 'Par de Mancuernas Hexagonales 10 kg', category: 'Pesas', priceValue: 46.0, badge: 'Caucho', description: 'Núcleo de acero con agarre cromado moleteado ergonómico.' },
      { name: 'Set 5 Bandas Elásticas Pro', category: 'Accesorios', priceValue: 22.0, badge: '5 niveles', description: 'Látex natural de resistencia progresiva para casa o viaje.' },
      { name: 'Colchoneta Yoga & Core TPE 8mm', category: 'Accesorios', priceValue: 26.0, badge: 'Antideslizante', description: 'Doble densidad con correa de transporte incluida.' },
      { name: 'Cuerda para Saltar Rodamiento Rápido', category: 'Cardio', priceValue: 16.5, badge: 'HIIT', description: 'Cable recubierto ajustable para saltos dobles fluidos.' },
      { name: 'Shaker Mezclador 700ml Libre BPA', category: 'Accesorios', priceValue: 11.0, badge: 'Antigoteo', description: 'Rejilla cónica silenciosa y compartimento inferior de rosca.' },
      { name: 'Straps de Levantamiento Acolchados', category: 'Pesas', priceValue: 14.9, badge: 'Agarre Pro', description: 'Algodón de alta tracción para peso muerto y remos pesados.' },
    ],
  },
  {
    id: 'courses',
    pattern: /(curso|academia|clase|educacion|escuela|taller|aprender|bootcamp)/,
    defaultTitle: 'Academia Digital · Cursos Prácticos',
    subtitle: 'Catálogo interactivo de programas por área con inscripción en vivo.',
    defaultAccent: '#a855f7',
    items: [
      { name: 'Fundamentos de Python desde Cero', category: 'Backend', priceValue: 29.0, badge: '18 horas', description: 'Variables, estructuras de datos, archivos JSON y APIs con FastAPI.' },
      { name: 'HTML5, CSS Grid & JavaScript Moderno', category: 'Frontend', priceValue: 25.0, badge: 'Proyectos', description: 'Construye interfaces responsivas y manipulacion segura del DOM.' },
      { name: 'React 19 + Next.js App Router', category: 'Frontend', priceValue: 39.0, badge: 'Full-Stack', description: 'Server Components, rutas API y despliegue continuo en Vercel.' },
      { name: 'PostgreSQL y Modelado Relacional', category: 'Datos', priceValue: 32.0, badge: 'SQL Real', description: 'Esquemas, índices, JOINs eficientes y migraciones seguras.' },
      { name: 'Docker y Despliegue en Ubuntu VPS', category: 'DevOps', priceValue: 34.0, badge: 'Servidor', description: 'Contenedores reproducibles, Docker Compose y proxy reverso.' },
      { name: 'Redes Neuronales Prácticas en JS y Python', category: 'IA Aplicada', priceValue: 44.0, badge: 'Nuevo', description: 'Clasificadores de texto, embeddings y evaluación honesta de modelos.' },
      { name: 'Diseño UI con Tailwind CSS v4', category: 'Diseño', priceValue: 24.0, badge: 'Visual', description: 'Sistemas de color, tipografía legible y estados interactivos.' },
      { name: 'Git, GitHub y Flujo Colaborativo', category: 'Herramientas', priceValue: 18.0, badge: 'Esencial', description: 'Ramas, commits limpios, Pull Requests y resolución de conflictos.' },
    ],
  },
];

function buildGenericTopicItems(subject: string, count: number, currency: string): CatalogItem[] {
  const clean = subject.replace(/^(?:de|sobre|para)\s+/i, '').trim() || 'Colección';
  const categories = ['Destacados', 'Esenciales', 'Novedades', 'Premium'];
  const badges = ['Recomendado', 'Popular', 'Nuevo', 'Edición Pro'];
  const variants = [
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
    const variant = variants[i % variants.length];
    const priceValue = 12 + ((i * 7) % 45);
    items.push({
      name: `${label} — ${variant} #${i + 1}`,
      category: categories[i % categories.length],
      priceValue,
      price: formatMoney(priceValue, currency),
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
  const norm = params.topicSubject ? normalizeText(params.topicSubject) : params.normalized;
  const currency = params.currencySymbol || '$';
  const count = params.requestedCount ?? (/\b20\b/.test(norm) ? 20 : 12);

  for (const preset of DOMAIN_PRESETS) {
    if (preset.pattern.test(norm)) {
      const picked: CatalogItem[] = [];
      for (let i = 0; i < count; i += 1) {
        const candidates = preset.id === 'tech' && /\b(laptops?|portatiles?)\b/.test(norm)
          ? preset.items.filter((item) => item.category === 'Laptops') : preset.items;
        const base = candidates[i % candidates.length];
        const name = i < (preset.id === 'tech' && /\b(laptops?|portatiles?)\b/.test(norm) ? 2 : preset.items.length) ? base.name : `${base.name} (Edición ${i + 1})`;
        picked.push({
          ...base,
          name,
          price: formatMoney(base.priceValue, currency),
        });
      }
      const computedTitle =
        preset.id === 'pets'
          ? `Tienda Canina · ${picked.length} Juguetes para Perritos`
          : preset.defaultTitle;
      return {
        title: params.brandName || (params.topicSubject && preset.id !== 'pets' ? titleCase(params.topicSubject) : computedTitle),
        subtitle: preset.subtitle,
        accent: params.accentColor || preset.defaultAccent,
        items: picked,
      };
    }
  }

  const subject =
    params.topicSubject ||
    params.raw
      .replace(/^(crea|genera|hazme|haz|dame|construye|arma)\s+(?:una\s+|un\s+)?(?:web|pagina|página|sitio|tienda|catalogo|catálogo|lista)\s*(?:de|sobre|para)?\s*/i, '')
      .slice(0, 52)
      .trim() ||
    'Catálogo Interactivo';
  return {
    title: params.brandName || titleCase(subject),
    subtitle: `Catálogo dinámico generado con ${count} elementos interactivos filtrables.`,
    accent: params.accentColor || '#38bdf8',
    items: buildGenericTopicItems(subject, count, currency),
  };
}

const CATALOG_ICONS: Record<string, string> = {
  laptop: 'M3 4h18v13H3z M1 21h22l-2-4H3z',
  car: 'M4 16H2v-5l2-1 3-5h10l3 5 2 1v5h-2 M7 16h10 M7 5l-2 6h14l-2-6 M7 16a2 2 0 1 0 0 .1 M19 16a2 2 0 1 0 0 .1',
  bag: 'M5 7h14l2 14H3L5 7z M9 8V6a3 3 0 0 1 6 0v2',
  shirt: 'M8 3l4 2 4-2 6 5-4 4-2-2v11H8V10l-2 2-4-4 6-5z',
  shoe: 'M3 13l3-7 5 6 10 4v5H3v-8z M11 12l-2 3 M14 13l-2 3 M3 18h18',
  paw: 'M8 10a2 3 0 1 0 0-.1 M16 10a2 3 0 1 0 0-.1 M4 14a2 2.5 0 1 0 0-.1 M20 14a2 2.5 0 1 0 0-.1 M7 20c0-3 3-6 5-6s5 3 5 6c0 3-4 1-5 1s-5 2-5-1z',
  food: 'M4 3v6 M7 3v6 M10 3v6 M4 8c0 5 6 5 6 0 M7 12v9 M18 3c-5 5-5 11 0 11v7 M18 3v11',
  book: 'M3 3h7l2 2 2-2h7v17h-7l-2 1-2-1H3V3z M12 5v16',
  fitness: 'M2 9v6 M5 6v12 M19 6v12 M22 9v6 M5 12h14',
};
function catalogIcon(item: CatalogSeed): string {
  const text = (item.name + ' ' + item.category).toLowerCase();
  if (/laptop|monitor|teclado|ssd|dock/.test(text)) return 'laptop';
  if (/carrit|coche|auto |vehiculo/.test(text)) return 'car';
  if (/mordedor|mascota|perrit|canin|peluche|olfativa/.test(text)) return 'paw';
  if (/zapat|calzado|shoe/.test(text)) return 'shoe';
  if (/ropa|polera|camisa|vestid|casaca|hoodie/.test(text)) return 'shirt';
  if (/comida|postre|cafe|café|plato|pizza|hamburguesa/.test(text)) return 'food';
  if (/curso|libro|taller|educacion/.test(text)) return 'book';
  if (/pesa|fitness|banda|proteina|creatina/.test(text)) return 'fitness';
  return 'bag';
}

export function buildCatalogStoreHtml(params: PromptParams): string {
  const { title, subtitle, accent, items } = selectCatalogItems(params);
  const c = resolveThemePalette(params.preferredTheme, accent);
  const categories = ['Todos', ...Array.from(new Set(items.map((x) => x.category)))];
  const serializedItems = JSON.stringify(items.map((item) => ({ ...item, icon: catalogIcon(item) }))).replace(/</g, '\\u003c');
  const currency = params.currencySymbol || '$';

  return `<!DOCTYPE html>
<html lang="es" data-elara-app="catalog">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: ${params.preferredTheme === 'light' ? 'light' : 'dark'}; --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --accent-ink: ${c.accentInk}; scrollbar-width: thin; scrollbar-color: var(--border) var(--bg); }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px 20px 64px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    h1 { font-size: clamp(2rem, 4vw, 3.4rem); letter-spacing: -0.02em; }
    .sub { color: var(--muted); font-size: 0.94rem; margin-top: 4px; }
    .cart-pill { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
    .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin: 22px 0; }
    .search-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: var(--surface); color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 7px 14px; font-size: 0.85rem; cursor: pointer; }
    .chip.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
    input[type="search"], select { background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 0.9rem; }
    input[type="search"] { min-width: 210px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: border-color 0.15s, transform 0.15s; }
    .card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .card-art { height: 144px; border-radius: 10px; border: 1px solid var(--border); background: radial-gradient(circle at top right, rgba(148,163,184,0.2), transparent 65%), var(--surface); display: flex; align-items: center; justify-content: center; position: relative; padding: 0 14px; margin-bottom: 10px; }
    .mono { width: 74px; height: 74px; border-radius: 10px; background: var(--accent); color: var(--accent-ink); font-weight: 800; display: grid; place-items: center; font-size: 0.9rem; letter-spacing: 0.04em; }
    .tag { position: absolute; top: 10px; right: 10px; max-width: calc(100% - 20px); display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: rgba(148,163,184,0.14); color: var(--accent); width: fit-content; }
    .card h3 { font-size: 1rem; margin-top: 4px; }
    .card p { font-size: 0.87rem; color: var(--muted); margin-top: 4px; }
    .card-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); }
    .price { font-weight: 700; font-size: 1.05rem; }
    .add { background: transparent; color: var(--text); border: 1px solid var(--accent); border-radius: 8px; padding: 6px 12px; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
    .add:hover { background: var(--accent); color: var(--accent-ink); }
    .summary { margin-top: 28px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: none; }
    .summary.open { display: block; }
    .summary ul { list-style: none; margin: 12px 0; display: grid; gap: 8px; }
    .summary li { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--muted); }
    .rm { background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 2px 8px; cursor: pointer; font-size: 0.78rem; }
    .checkout-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); }
    #orderFeedback { font-size: 0.85rem; color: var(--text); font-weight: 600; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) {
      .container { padding: 24px 16px 48px; }
      header { align-items: flex-start; gap: 18px; }
      .grid { grid-template-columns: 1fr; gap: 12px; }
      .card { padding: 14px; min-width: 0; overflow-wrap: anywhere; }
      .card-content { display: grid; grid-template-columns: 82px minmax(0,1fr); gap: 5px 12px; align-items: start; }
      .card-art { grid-row: 1 / span 2; min-height: 110px; height: auto; margin: 0; padding: 8px; flex-direction: column; gap: 8px; }
      .tag { position: static; max-width: 100%; font-size: 10px; text-align: center; padding: 3px 5px; color: var(--text); }
      .mono { flex-shrink: 0; width: 52px; height: 52px; }
      .mono svg { width: 36px; height: 36px; }
      .card h3 { font-size: 1rem; margin: 0; line-height: 1.4; }
      .card p { font-size: .875rem; line-height: 1.5; margin: 0; }
      .card-foot { flex-wrap: wrap; gap: 10px; }
      .search-row { width: 100%; }
      input[type="search"], select { width: 100%; min-width: 0; }
      .chip { min-height: 36px; font-size: .875rem; }
    }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <div class="container">
    <p style="color:var(--muted);font-size:.75rem;margin-bottom:20px">Prototipo interactivo · Productos y precios de ejemplo</p>
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="sub">${escapeHtml(subtitle)}</p>
      </div>
      <button type="button" class="cart-pill" id="cartToggle">Carrito (<span id="cartCount">0</span>) · <span id="cartTotal">${escapeHtml(formatMoney(0, currency))}</span></button>
    </header>

    <div class="controls">
      <div class="chips" id="categoryBar">
        ${categories.map((cat, idx) => `<button type="button" class="chip${idx === 0 ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
      </div>
      <div class="search-row">
        <select id="sortSelect" aria-label="Ordenar productos">
          <option value="default">Orden: Destacados</option>
          <option value="asc">Precio: menor a mayor</option>
          <option value="desc">Precio: mayor a menor</option>
        </select>
        <input id="searchInput" type="search" placeholder="Buscar entre ${items.length} opciones..." />
      </div>
    </div>

    <main class="grid" id="catalogGrid"></main>

    <section class="summary" id="cartPanel">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>Tu pedido (<span id="panelCount">0</span> artículos)</strong>
        <button type="button" class="chip" id="clearCart">Vaciar</button>
      </div>
      <ul id="cartItems"></ul>
      <div class="checkout-row">
        <span id="orderFeedback"></span>
        <button type="button" class="cart-pill" id="checkoutBtn">Confirmar pedido</button>
      </div>
    </section>
  </div>

  <script>
    const ITEMS = ${serializedItems};
    const ICON_PATHS = ${JSON.stringify(CATALOG_ICONS)};
    const CURRENCY = ${JSON.stringify(currency === 'S/' ? 'S/ ' : currency)};
    let activeCat = 'Todos';
    let query = '';
    let sortMode = 'default';
    const cart = [];
    const grid = document.getElementById('catalogGrid');

    function updateCartUI() {
      const total = cart.reduce((acc, item) => acc + Number(item.priceValue || 0), 0);
      document.getElementById('cartCount').textContent = String(cart.length);
      document.getElementById('panelCount').textContent = String(cart.length);
      document.getElementById('cartTotal').textContent = CURRENCY + total.toFixed(2);
      const list = document.getElementById('cartItems');
      list.replaceChildren();
      cart.forEach((item, idx) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = (idx + 1) + '. ' + item.name;
        const right = document.createElement('span');
        right.style.display = 'inline-flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';
        const priceSpan = document.createElement('strong');
        priceSpan.textContent = item.price;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'rm';
        rm.textContent = '×';
        rm.addEventListener('click', () => { cart.splice(idx, 1); updateCartUI(); });
        right.append(priceSpan, rm);
        li.append(nameSpan, right);
        list.appendChild(li);
      });
    }

    function renderGrid() {
      grid.replaceChildren();
      let filtered = ITEMS.filter((item) => {
        const matchCat = activeCat === 'Todos' || item.category === activeCat;
        const q = query.toLowerCase();
        const matchText = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        return matchCat && matchText;
      });
      if (sortMode === 'asc') filtered = [...filtered].sort((a, b) => a.priceValue - b.priceValue);
      if (sortMode === 'desc') filtered = [...filtered].sort((a, b) => b.priceValue - a.priceValue);
      filtered.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'card';
        const top = document.createElement('div');
        top.className = 'card-content';
        const art = document.createElement('div');
        art.className = 'card-art';
        const mono = document.createElement('span');
        mono.className = 'mono';
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('width','48'); icon.setAttribute('height','48');
        icon.setAttribute('fill','none'); icon.setAttribute('stroke','currentColor'); icon.setAttribute('stroke-width','1.25'); icon.setAttribute('stroke-linecap','round'); icon.setAttribute('stroke-linejoin','round'); icon.setAttribute('aria-hidden','true');
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',ICON_PATHS[item.icon] || ICON_PATHS.bag); icon.appendChild(path); mono.appendChild(icon);
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = item.category + ' · ' + item.badge;
        art.append(mono, tag);
        const h3 = document.createElement('h3');
        h3.textContent = (index + 1) + '. ' + item.name;
        const p = document.createElement('p');
        p.textContent = item.description;
        top.append(art, h3, p);

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
          document.getElementById('orderFeedback').textContent = '';
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
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      sortMode = e.target.value;
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
      document.getElementById('orderFeedback').textContent = '';
      updateCartUI();
    });
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      const fb = document.getElementById('orderFeedback');
      if (cart.length === 0) {
        fb.textContent = 'Agrega al menos un producto para confirmar.';
        return;
      }
      const code = 'ELR-' + String(Math.floor(1000 + Math.random() * 9000));
      fb.textContent = 'Pedido de prueba ' + code + ' listo (' + cart.length + ' artículos).';
    });
    renderGrid();
  </script>
</body>
</html>`;
}

export function buildTodoAppHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Gestor de Tareas');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="todo">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand} — Tareas</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding: 28px 16px; }
    .app { max-width: 680px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 22px; display: grid; gap: 18px; }
    header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
    h1 { font-size: 1.5rem; }
    .stats { font-size: 0.86rem; color: var(--muted); }
    form { display: flex; gap: 8px; flex-wrap: wrap; }
    input, select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.92rem; }
    input { flex: 1; min-width: 190px; }
    button.primary { background: var(--accent); color: var(--ink); border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 0.82rem; cursor: pointer; }
    .tab.active { background: var(--accent); color: var(--ink); border-color: var(--accent); font-weight: 600; }
    ul { list-style: none; display: grid; gap: 8px; }
    li { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; }
    .left { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; }
    .done { text-decoration: line-through; color: var(--muted); }
    .prio { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--accent); }
    .del { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 1rem; padding: 2px 6px; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <main class="app">
    <header>
      <h1>${brand}</h1>
      <span class="stats" id="stats">0 pendientes</span>
    </header>
    <form id="todoForm">
      <input id="todoInput" required placeholder="Añade una tarea o pendiente..." />
      <select id="prioSelect">
        <option value="Alta">Alta</option>
        <option value="Media" selected>Media</option>
        <option value="Baja">Baja</option>
      </select>
      <button class="primary" type="submit">Agregar</button>
    </form>
    <div class="tabs" id="filterTabs">
      <button type="button" class="tab active" data-filter="all">Todas</button>
      <button type="button" class="tab" data-filter="open">Pendientes</button>
      <button type="button" class="tab" data-filter="done">Completadas</button>
    </div>
    <ul id="todoList"></ul>
  </main>
  <script>
    let filter = 'all';
    const tasks = [
      { id: 1, text: 'Definir estructura principal de index.html', prio: 'Alta', done: true },
      { id: 2, text: 'Probar filtros y responsive en móvil', prio: 'Media', done: false },
      { id: 3, text: 'Publicar versión final en Vercel', prio: 'Baja', done: false }
    ];
    const listEl = document.getElementById('todoList');
    function render() {
      const pending = tasks.filter((t) => !t.done).length;
      document.getElementById('stats').textContent = pending + ' pendientes · ' + tasks.length + ' en total';
      listEl.replaceChildren();
      tasks
        .filter((t) => filter === 'all' || (filter === 'open' ? !t.done : t.done))
        .forEach((task) => {
          const li = document.createElement('li');
          const left = document.createElement('label');
          left.className = 'left';
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.style.flex = 'none';
          chk.style.minWidth = 'auto';
          chk.checked = task.done;
          chk.addEventListener('change', () => { task.done = chk.checked; render(); });
          const span = document.createElement('span');
          span.textContent = task.text;
          if (task.done) span.className = 'done';
          left.append(chk, span);

          const right = document.createElement('div');
          right.style.display = 'flex';
          right.style.alignItems = 'center';
          right.style.gap = '8px';
          const prio = document.createElement('span');
          prio.className = 'prio';
          prio.textContent = task.prio;
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'del';
          del.textContent = '×';
          del.addEventListener('click', () => {
            const idx = tasks.findIndex((x) => x.id === task.id);
            if (idx >= 0) tasks.splice(idx, 1);
            render();
          });
          right.append(prio, del);
          li.append(left, right);
          listEl.appendChild(li);
        });
    }
    document.getElementById('todoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('todoInput');
      const text = input.value.trim();
      if (!text) return;
      tasks.unshift({ id: Date.now(), text, prio: document.getElementById('prioSelect').value, done: false });
      input.value = '';
      render();
    });
    document.getElementById('filterTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      filter = btn.dataset.filter;
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
    render();
  </script>
</body>
</html>`;
}

export function buildPomodoroHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Temporizador Focus');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="pomodoro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .card { width: 100%; max-width: 390px; background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 28px; text-align: center; display: grid; gap: 20px; }
    .modes { display: flex; justify-content: center; gap: 8px; }
    .mode { background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 0.84rem; cursor: pointer; }
    .mode.active { background: var(--accent); color: var(--ink); border-color: var(--accent); font-weight: 700; }
    .clock { font-size: 4rem; font-weight: 800; font-family: ui-monospace, monospace; letter-spacing: 0.04em; color: var(--accent); }
    .actions { display: flex; gap: 10px; justify-content: center; }
    button.btn { background: var(--accent); color: var(--ink); border: 0; border-radius: 12px; padding: 11px 22px; font-weight: 700; cursor: pointer; }
    button.ghost { background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 11px 18px; cursor: pointer; }
    small { color: var(--muted); }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <main class="card">
    <h1>${brand}</h1>
    <div class="modes" id="modeBar">
      <button type="button" class="mode active" data-sec="1500">Enfoque 25m</button>
      <button type="button" class="mode" data-sec="300">Descanso 5m</button>
      <button type="button" class="mode" data-sec="900">Largo 15m</button>
    </div>
    <div class="clock" id="clock">25:00</div>
    <div class="actions">
      <button type="button" class="btn" id="toggleBtn">Iniciar</button>
      <button type="button" class="ghost" id="resetBtn">Reiniciar</button>
    </div>
    <small id="cycles">Sesiones completadas: 0</small>
  </main>
  <script>
    let baseSec = 1500;
    let leftSec = 1500;
    let timer = null;
    let done = 0;
    const clock = document.getElementById('clock');
    const toggleBtn = document.getElementById('toggleBtn');
    function draw() {
      const m = String(Math.floor(leftSec / 60)).padStart(2, '0');
      const s = String(leftSec % 60).padStart(2, '0');
      clock.textContent = m + ':' + s;
    }
    function stop() { clearInterval(timer); timer = null; toggleBtn.textContent = 'Iniciar'; }
    toggleBtn.addEventListener('click', () => {
      if (timer) { stop(); return; }
      toggleBtn.textContent = 'Pausar';
      timer = setInterval(() => {
        if (leftSec > 0) { leftSec -= 1; draw(); return; }
        stop(); done += 1;
        document.getElementById('cycles').textContent = 'Sesiones completadas: ' + done;
      }, 1000);
    });
    document.getElementById('resetBtn').addEventListener('click', () => { stop(); leftSec = baseSec; draw(); });
    document.getElementById('modeBar').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-sec]');
      if (!btn) return;
      stop();
      baseSec = Number(btn.dataset.sec);
      leftSec = baseSec;
      document.querySelectorAll('.mode').forEach((m) => m.classList.toggle('active', m === btn));
      draw();
    });
  </script>
</body>
</html>`;
}

export function buildQuizAppHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Trivia Interactiva');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="quiz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .quiz { width: 100%; max-width: 560px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 24px; display: grid; gap: 16px; }
    .bar { height: 6px; border-radius: 999px; background: var(--bg); overflow: hidden; }
    .fill { height: 100%; background: var(--accent); width: 0%; transition: width 0.2s; }
    h2 { font-size: 1.2rem; }
    .opts { display: grid; gap: 10px; }
    .opt { text-align: left; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--text); cursor: pointer; font-size: 0.94rem; }
    .opt:hover { border-color: var(--accent); }
    .opt.ok { border-color: #10b981; background: rgba(16,185,129,0.16); }
    .opt.bad { border-color: #f43f5e; background: rgba(244,63,94,0.16); }
    button.next { background: var(--accent); color: var(--ink); border: 0; border-radius: 10px; padding: 10px 18px; font-weight: 700; cursor: pointer; justify-self: end; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <main class="quiz">
    <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:0.85rem;">
      <span>${brand}</span>
      <span id="counter">1 / 4</span>
    </div>
    <div class="bar"><div class="fill" id="fill"></div></div>
    <h2 id="qText"></h2>
    <div class="opts" id="opts"></div>
    <button type="button" class="next" id="nextBtn" style="display:none;">Siguiente</button>
  </main>
  <script>
    const QUESTIONS = [
      { q: '¿Qué etiqueta HTML define el contenido principal único de una página?', a: ['<div>', '<main>', '<span>', '<section>'], ok: 1 },
      { q: '¿Qué código HTTP indica que un recurso no fue encontrado?', a: ['200', '401', '404', '503'], ok: 2 },
      { q: 'En JavaScript, ¿qué método inserta texto sin interpretar HTML?', a: ['innerHTML', 'textContent', 'eval', 'write'], ok: 1 },
      { q: '¿Qué propiedad CSS habilita un diseño flexible en fila o columna?', a: ['display: flex', 'position: static', 'float: none', 'overflow: auto'], ok: 0 }
    ];
    let idx = 0, score = 0, locked = false;
    const nextBtn = document.getElementById('nextBtn');
    function render() {
      locked = false;
      nextBtn.style.display = 'none';
      if (idx >= QUESTIONS.length) {
        document.getElementById('fill').style.width = '100%';
        document.getElementById('counter').textContent = 'Finalizado';
        document.getElementById('qText').textContent = 'Puntaje final: ' + score + ' de ' + QUESTIONS.length;
        const opts = document.getElementById('opts');
        opts.replaceChildren();
        nextBtn.textContent = 'Volver a jugar';
        nextBtn.style.display = 'inline-block';
        return;
      }
      const cur = QUESTIONS[idx];
      document.getElementById('counter').textContent = (idx + 1) + ' / ' + QUESTIONS.length;
      document.getElementById('fill').style.width = Math.round((idx / QUESTIONS.length) * 100) + '%';
      document.getElementById('qText').textContent = cur.q;
      const opts = document.getElementById('opts');
      opts.replaceChildren();
      cur.a.forEach((label, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.textContent = label;
        b.addEventListener('click', () => {
          if (locked) return;
          locked = true;
          if (i === cur.ok) { score += 1; b.classList.add('ok'); }
          else { b.classList.add('bad'); opts.children[cur.ok].classList.add('ok'); }
          nextBtn.textContent = idx + 1 === QUESTIONS.length ? 'Ver resultado' : 'Siguiente';
          nextBtn.style.display = 'inline-block';
        });
        opts.appendChild(b);
      });
    }
    nextBtn.addEventListener('click', () => {
      if (idx >= QUESTIONS.length) { idx = 0; score = 0; }
      else { idx += 1; }
      render();
    });
    render();
  </script>
</body>
</html>`;
}

export function buildPaletteGeneratorHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Generador de Paletas CSS');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="palette">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 28px 18px; }
    .wrap { max-width: 820px; margin: 0 auto; display: grid; gap: 18px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    button.gen { background: var(--accent); color: var(--ink); border: 0; border-radius: 10px; padding: 10px 18px; font-weight: 700; cursor: pointer; }
    .swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
    .swatch { border-radius: 14px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); cursor: pointer; }
    .box { height: 110px; }
    .hex { padding: 10px; text-align: center; font-family: ui-monospace, monospace; font-size: 0.9rem; }
    .grad { height: 96px; border-radius: 14px; border: 1px solid var(--border); display: grid; place-items: center; font-family: ui-monospace, monospace; font-size: 0.85rem; text-shadow: 0 1px 4px rgba(0,0,0,0.65); }
    #note { font-size: 0.88rem; color: var(--accent); min-height: 1.3em; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${brand}</h1>
      <button type="button" class="gen" id="genBtn">Nueva paleta</button>
    </header>
    <div class="swatches" id="swatches"></div>
    <div class="grad" id="gradBox"></div>
    <p id="note">Haz clic en cualquier color para ver su código CSS.</p>
  </div>
  <script>
    function randHex() { return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); }
    function draw() {
      const colors = [randHex(), randHex(), randHex(), randHex(), randHex()];
      const wrap = document.getElementById('swatches');
      wrap.replaceChildren();
      colors.forEach((hex) => {
        const card = document.createElement('div');
        card.className = 'swatch';
        const box = document.createElement('div');
        box.className = 'box';
        box.style.background = hex;
        const lbl = document.createElement('div');
        lbl.className = 'hex';
        lbl.textContent = hex.toUpperCase();
        card.append(box, lbl);
        card.addEventListener('click', () => {
          document.getElementById('note').textContent = 'Color seleccionado: ' + hex.toUpperCase();
          if (navigator.clipboard) navigator.clipboard.writeText(hex).catch(() => {});
        });
        wrap.appendChild(card);
      });
      const gradCss = 'linear-gradient(135deg, ' + colors[0] + ', ' + colors[2] + ', ' + colors[4] + ')';
      const gb = document.getElementById('gradBox');
      gb.style.background = gradCss;
      gb.textContent = gradCss;
    }
    document.getElementById('genBtn').addEventListener('click', draw);
    draw();
  </script>
</body>
</html>`;
}

export function buildBlogHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Revista Digital');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="blog">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand} — Artículos</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 28px 18px; line-height: 1.6; }
    .wrap { max-width: 900px; margin: 0 auto; display: grid; gap: 22px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { background: var(--surface); color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 0.84rem; cursor: pointer; }
    .chip.active { background: var(--accent); color: var(--ink); border-color: var(--accent); font-weight: 700; }
    .posts { display: grid; gap: 14px; }
    .post { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; cursor: pointer; }
    .post:hover { border-color: var(--accent); }
    .meta { font-size: 0.78rem; color: var(--accent); font-weight: 600; margin-bottom: 6px; }
    .post p { color: var(--muted); font-size: 0.92rem; margin-top: 6px; }
    .reader { background: var(--surface); border: 1px solid var(--accent); border-radius: 14px; padding: 20px; display: none; gap: 10px; }
    .reader.open { display: grid; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>${brand}</h1>
        <p style="color:var(--muted);font-size:0.9rem;">Publicaciones breves sobre ingeniería, diseño y producto.</p>
      </div>
      <div class="chips" id="tagBar">
        <button type="button" class="chip active" data-tag="Todos">Todos</button>
        <button type="button" class="chip" data-tag="Ingeniería">Ingeniería</button>
        <button type="button" class="chip" data-tag="Diseño">Diseño</button>
        <button type="button" class="chip" data-tag="IA">IA</button>
      </div>
    </header>
    <article class="reader" id="readerPanel">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="meta" id="readerMeta"></span>
        <button type="button" class="chip" id="closeReader">Cerrar lectura</button>
      </div>
      <h2 id="readerTitle"></h2>
      <p id="readerBody" style="color:var(--muted);"></p>
    </article>
    <main class="posts" id="postList"></main>
  </div>
  <script>
    const POSTS = [
      { tag: 'Ingeniería', time: '4 min', title: 'Arquitectura híbrida web + Android para comunidades rápidas', summary: 'Cómo compartir identidad y sesiones sin duplicar infraestructura.', body: 'Separar la autenticación OAuth en el backend principal permite que clientes web y móviles reutilicen la misma sesión mediante tokens cortos y revocación centralizada.' },
      { tag: 'Diseño', time: '3 min', title: 'Legibilidad en modo oscuro sin fatiga visual', summary: 'Por qué los fondos azul-pizarra superan al negro puro #000.', body: 'Usar superficies escalonadas (#06080E, #0B0F18 y #121826) mejora el contraste de código fuente y tarjetas sin generar halos incómodos.' },
      { tag: 'IA', time: '5 min', title: 'Del motor determinístico a un modelo propio en VPS', summary: 'Pasos prácticos para empezar ligero y escalar cuando haya demanda.', body: 'Comenzar con rutas seguras en Next.js y luego conectar un endpoint OpenAI-compatible en tu propio servidor evita bloqueos de presupuesto mientras validas el producto.' }
    ];
    let tag = 'Todos';
    const list = document.getElementById('postList');
    function render() {
      list.replaceChildren();
      POSTS.filter((p) => tag === 'Todos' || p.tag === tag).forEach((p) => {
        const card = document.createElement('article');
        card.className = 'post';
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = p.tag + ' · ' + p.time + ' lectura';
        const h2 = document.createElement('h2');
        h2.textContent = p.title;
        const summary = document.createElement('p');
        summary.textContent = p.summary;
        card.append(meta, h2, summary);
        card.addEventListener('click', () => {
          document.getElementById('readerMeta').textContent = p.tag + ' · ' + p.time;
          document.getElementById('readerTitle').textContent = p.title;
          document.getElementById('readerBody').textContent = p.body;
          document.getElementById('readerPanel').classList.add('open');
        });
        list.appendChild(card);
      });
    }
    document.getElementById('tagBar').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tag]');
      if (!btn) return;
      tag = btn.dataset.tag;
      document.querySelectorAll('#tagBar .chip').forEach((c) => c.classList.toggle('active', c === btn));
      render();
    });
    document.getElementById('closeReader').addEventListener('click', () => {
      document.getElementById('readerPanel').classList.remove('open');
    });
    render();
  </script>
</body>
</html>`;
}

export function buildBookingFormHtml(params: PromptParams): string {
  const brand = escapeHtml(params.brandName || 'Formulario & Reservas');
  const c = resolveThemePalette(params.preferredTheme, params.accentColor);
  return `<!DOCTYPE html>
<html lang="es" data-elara-app="form">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="elara-spec" content="${serializeWebSpec(params)}" />
  <title>${brand}</title>
  <style>
    :root { --bg: ${c.bg}; --surface: ${c.surface}; --card: ${c.card}; --border: ${c.border}; --text: ${c.text}; --muted: ${c.muted}; --accent: ${c.accent}; --ink: ${c.accentInk}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .box { width: 100%; max-width: 520px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 24px; display: grid; gap: 16px; }
    label { display: grid; gap: 6px; font-size: 0.88rem; color: var(--muted); }
    input, select, textarea { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.94rem; font-family: inherit; }
    button { background: var(--accent); color: var(--ink); border: 0; border-radius: 10px; padding: 11px 16px; font-weight: 700; cursor: pointer; }
    .receipt { background: var(--card); border: 1px solid var(--accent); border-radius: 12px; padding: 14px; display: none; gap: 6px; font-size: 0.9rem; }
    .receipt.open { display: grid; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
    button, input, select { font: inherit; }
    h1 { letter-spacing: -.045em; line-height: 1.12; }
    @media(max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; min-width: 0; overflow-wrap: anywhere; } .card-art { height: 110px; padding: 10px; gap: 6px; } .tag { min-width: 0; overflow-wrap: anywhere; } .mono { flex-shrink: 0; width: 58px; height: 58px; } .card-foot { flex-wrap: wrap; gap: 10px; } .container { padding: 20px 0; } }
    @media(max-width: 360px) { .grid { grid-template-columns: 1fr; } }
    @media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
  </style>
</head>
<body>
  <main class="box">
    <div>
      <h1>${brand}</h1>
      <p style="color:var(--muted);font-size:0.9rem;margin-top:4px;">Completa tus datos para registrar una solicitud o reserva.</p>
    </div>
    <form id="bookingForm" style="display:grid;gap:12px;">
      <label>Nombre completo<input id="fName" required minlength="2" placeholder="Ej. Sofía Paredes" /></label>
      <label>Correo de contacto<input id="fEmail" type="email" required placeholder="nombre@correo.com" /></label>
      <label>Servicio / Motivo
        <select id="fTopic">
          <option>Asesoría técnica</option>
          <option>Reserva de cita</option>
          <option>Cotización web</option>
        </select>
      </label>
      <label>Mensaje adicional<textarea id="fNotes" rows="3" placeholder="Detalles opcionales..."></textarea></label>
      <button type="submit">Enviar solicitud</button>
    </form>
    <section class="receipt" id="receipt">
      <strong>Resumen generado</strong>
      <p id="receiptText" style="color:var(--muted);"></p>
    </section>
  </main>
  <script>
    document.getElementById('bookingForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('fName').value.trim();
      const email = document.getElementById('fEmail').value.trim();
      const topic = document.getElementById('fTopic').value;
      document.getElementById('receiptText').textContent = 'Solicitud lista para ' + name + ' (' + email + ') — ' + topic + '. Conecta aquí tu endpoint POST /api.';
      document.getElementById('receipt').classList.add('open');
    });
  </script>
</body>
</html>`;
}

export function buildWebFromPrompt(params: PromptParams): {
  intent: string;
  description: string;
  html: string;
} {
  const norm = params.normalized;

  if (/\b(todo|to-do|tareas|lista\s+de\s+tareas|pendientes|kanban)\b/.test(norm)) {
    return {
      intent: 'code_index_todo',
      description: 'Generé una app interactiva de **Gestor de Tareas (`index.html`)** con prioridades, filtros y contador en vivo:',
      html: buildTodoAppHtml(params),
    };
  }
  if (/\b(pomodoro|temporizador|cronometro|timer|reloj)\b/.test(norm)) {
    return {
      intent: 'code_index_pomodoro',
      description: 'Aquí tienes un **Temporizador Pomodoro interactivo (`index.html`)** con modos Enfoque/Descanso:',
      html: buildPomodoroHtml(params),
    };
  }
  if (/\b(quiz|trivia|cuestionario|examen|preguntas)\b/.test(norm)) {
    return {
      intent: 'code_index_quiz',
      description: 'Generé una **Trivia / Quiz interactiva (`index.html`)** con barra de progreso y puntuación final:',
      html: buildQuizAppHtml(params),
    };
  }
  if (/\b(paletas?|colores|gradientes?|picker)\b/.test(norm)) {
    return {
      intent: 'code_index_palette',
      description: 'Aquí tienes un **Generador de Paletas y Gradientes CSS (`index.html`)** interactivo:',
      html: buildPaletteGeneratorHtml(params),
    };
  }
  if (/\b(blog|revista|noticias|articulos|periodico)\b/.test(norm)) {
    return {
      intent: 'code_index_blog',
      description: 'Generé un **Blog / Revista Digital (`index.html`)** con filtro por etiquetas y vista de lectura rápida:',
      html: buildBlogHtml(params),
    };
  }
  if (/\b(formulario|contacto|reserva|cita|encuesta)\b/.test(norm)) {
    return {
      intent: 'code_index_form',
      description: 'Aquí tienes un **Formulario / Reserva interactivo (`index.html`)** con validación HTML5 y resumen:',
      html: buildBookingFormHtml(params),
    };
  }

  const matchesCatalogPreset = DOMAIN_PRESETS.some((p) => p.pattern.test(norm));
  if (
    params.requestedCount != null ||
    matchesCatalogPreset ||
    /(tienda|catalogo|productos|galeria|servicios|lista\s+de)/.test(norm)
  ) {
    const info = selectCatalogItems(params);
    return {
      intent: 'code_index_dynamic_catalog',
      description: `Generé un \`index.html\` completo para **${info.title}** con **${info.items.length} productos de ejemplo**, buscador en vivo, filtro por categorías y carrito interactivo:`,
      html: buildCatalogStoreHtml(params),
    };
  }

  return {
    intent: '',
    description: '',
    html: '',
  };
}
