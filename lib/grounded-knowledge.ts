import type { SimpleTurn } from './elara-engine/engine';
import { activeConversationTurns, isConversationFollowUp } from './conversation-context';
import { normalizeRequestSpelling } from './elara-engine/request-meaning';
import { normalizeText } from './elara-engine/text';

// Curated paraphrases of stable primary sources. No per-message internet access.
const NOTES=[
 {id:'ice-density',match:/\b(?:hielo|iceberg)\b/,text:'Densidad = masa/volumen. El hielo ocupa más volumen que la misma masa de agua líquida; su estructura cristalina lo hace menos denso y por eso flota.',url:'https://openstax.org/books/biology-2e/pages/2-2-water'},
 {id:'buoyancy',match:/\b(?:barcos?|flotacion|empuje|flota|flotan|submarinos?|globos?|helio)\b/,text:'El empuje equivale al peso del fluido desplazado. Un barco flota cuando el empuje del agua equilibra su peso; importa la densidad media del casco con su aire. El aire del casco no sustituye al agua. Un globo de helio recibe empuje del aire y un submarino ajusta su densidad con lastre.',url:'https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy'},
 {id:'photosynthesis',match:/\bfotosintesis\b|\bplantas\b.*\b(?:luz|energia|crecer|crecen)\b/,text:'La fotosíntesis usa energía de la luz, agua y dióxido de carbono para producir azúcares; libera oxígeno. Los azúcares almacenan energía química y aportan materia para crecer. La clorofila capta luz; las plantas también realizan respiración celular.',url:'https://openstax.org/books/concepts-biology/pages/5-1-overview-of-photosynthesis'},
 {id:'sky-colors',match:/\b(?:cielo|atardecer|amanecer)\b/,text:'Las moléculas del aire dispersan la luz azul más que la roja: por eso vemos azul el cielo diurno. Al atardecer la luz atraviesa más atmósfera; se dispersa más azul fuera de la trayectoria directa y predominan tonos rojos y anaranjados. No es el reflejo del mar.',url:'https://spaceplace.nasa.gov/blue-sky/en/'},
 {id:'seasons',match:/\b(?:estaciones|invierno|verano|otono|primavera)\b/,text:'Las estaciones se deben principalmente a la inclinación del eje terrestre mientras la Tierra orbita el Sol, no a estar más cerca o lejos. Los hemisferios reciben distinta inclinación y duración de la luz; sus estaciones son opuestas.',url:'https://spaceplace.nasa.gov/seasons/en/'},
 {id:'water-cycle',match:/\b(?:evaporacion|condensacion|ciclo del agua|nubes?|vapor de agua)\b/,text:'Evaporación: agua líquida pasa a vapor. Condensación: el vapor se convierte en líquido, formando gotas; las nubes contienen diminutas gotas o cristales de hielo. La precipitación devuelve agua a la superficie. El ciclo conecta atmósfera, agua superficial y subterránea.',url:'https://www.usgs.gov/special-topics/water-science-school/water-cycle'},
 {id:'cells-and-atoms',match:/\b(?:celulas?|atomos?|moleculas?)\b/,text:'Un átomo es una unidad de un elemento químico. Una molécula reúne átomos enlazados. Una célula es una unidad de vida organizada, compuesta por muchas moléculas y capaz de procesos vitales; no es otro nombre para átomo.',url:'https://openstax.org/books/biology-2e/pages/1-2-themes-and-concepts-of-biology'},
 {id:'dns',match:/\bdns\b|\b(?:dominio|nombre de una web)\b.*\bip\b/,text:'DNS es un sistema distribuido que permite consultar registros asociados a nombres de dominio, entre ellos direcciones IP. Esos nombres facilitan localizar servicios sin memorizar direcciones numéricas; DNS no es el alojamiento ni cifra por sí solo la conexión.',url:'https://www.icann.org/resources/pages/dns-2022-09-13-en'},
];

export function groundedKnowledge(turns:SimpleTurn[]):{text:string;sources:Array<{id:string;url:string}>}{
 const active=activeConversationTurns(turns),latest=active.at(-1)?.text || '';
 const clean=(text:string)=>normalizeText(normalizeRequestSpelling(text.replace(/```[\s\S]*?(?:```|$)/g,'')));
 const norm=clean(latest);
 if(/\b(?:poema|cuento|versos|ficcion|eslogan|publicaciones|anuncio|diagnostico|medicamento|tratamiento)\b/.test(norm))return {text:'',sources:[]};
 let selected=NOTES.filter(note=>note.match.test(norm));
 if(!selected.length&&(isConversationFollowUp(latest)||/^(?:y )?por que\s+(?:dame|explica|no repitas)\b/.test(norm))){
  for(const previous of active.slice(0,-1).filter(turn=>turn.role==='user').slice(-4).reverse()){
   selected=NOTES.filter(note=>note.match.test(clean(previous.text)));
   if(selected.length)break;
  }
 }
 selected=selected.slice(0,2);
 return {text:selected.map(note=>note.text).join('\n').slice(0,800),sources:selected.map(({id,url})=>({id,url}))};
}
