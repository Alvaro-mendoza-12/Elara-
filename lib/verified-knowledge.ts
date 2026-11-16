import type { SimpleTurn } from './elara-engine/engine';
import { groundedKnowledge } from './grounded-knowledge';
import { normalizeRequestSpelling } from './elara-engine/request-meaning';
import { normalizeText } from './elara-engine/text';

/** A deliberately small public reference tool, not a general factual oracle. */
export function verifiedKnowledgeReply(turns:SimpleTurn[]):string|null {
 const latest=turns.at(-1)?.text || '';
 const norm=normalizeText(normalizeRequestSpelling(latest));
 if(latest.includes('```')||/\b(?:json|versos?|poema|cuento|tabla|traduce|ingles|portugues|frances|demuestra|calcula|disena|crea|genera|pagina|web|aceite|gasolina|experimento|tratamiento|diagnostico)\b/.test(norm))return null;
 const explanatory=/\b(?:por que|que es|que son|explica|explicame|explicas|diferencia|como funciona|como funcionan)\b/.test(norm);
 const example=/\b(?:dame|ponme|pon)\s+(?:otro\s+|un\s+)?ejemplo\b/.test(norm);
 const simpler=/\b(?:hazl[oa] mas (?:sencillo|sencilla|simple|claro|clara)|como para un nino)\b/.test(norm);
 if(!explanatory&&!example&&!simpler)return null;
 const knowledge=groundedKnowledge(turns);
 if(knowledge.sources.length!==1)return null;
 const id=knowledge.sources[0].id;
 let reply='';
 if(id==='photosynthesis'){
  if(/\b(?:historia|descubrio|calvin|enzima|c4|c3|cam)\b/.test(norm))return null;
  reply=example?'Una planta de tomate usa la luz, el agua y el dióxido de carbono para producir azúcares. Esos azúcares aportan energía química y materia para crecer.':simpler?'La planta usa la luz para fabricar azúcares con agua y aire. Esos azúcares le dan energía y material para crecer.':/^por que(?:\s+dame|\s+no repitas|$)/.test(norm)?'La clorofila capta luz y esa energía impulsa las reacciones que forman azúcares a partir de agua y dióxido de carbono. Esos azúcares aportan energía química y materia para crecer.':'Las plantas necesitan luz para la fotosíntesis: con esa energía convierten agua y dióxido de carbono en azúcares, liberando oxígeno. Los azúcares aportan energía química y materia para crecer.';
 }else if(id==='ice-density'){
  if(/\b(?:hielo|iceberg)\b/.test(norm)&&!/\b(?:flota|flotan|densidad|denso|densa)\b/.test(norm))return null;
  reply='El hielo flota porque es menos denso que el agua líquida. Al congelarse, su estructura cristalina ocupa más volumen con la misma masa: densidad = masa/volumen.';
 }else if(id==='buoyancy'){
  reply=example||/\b(?:globo|globos|helio)\b/.test(norm)?'Un globo de helio puede subir porque el empuje del aire desplazado supera su peso total. Es el mismo principio de Arquímedes aplicado al aire.':/\bsubmarino\b/.test(norm)?'Un submarino puede ajustar su densidad media mediante los tanques de lastre. Así cambia el equilibrio entre su peso y el empuje del agua para subir o bajar.':simpler?'El agua empuja el barco hacia arriba. Su casco con aire permite desplazar suficiente agua para que ese empuje equilibre su peso.':/\b(?:barco|barcos|acero)\b/.test(norm)?'Un barco de acero flota cuando el empuje del agua equilibra su peso. Su casco con aire reduce la densidad media del conjunto y permite desplazar suficiente agua; el empuje equivale al peso del agua desplazada.':'Según el principio de Arquímedes, el empuje equivale al peso del fluido desplazado. Un objeto puede flotar si ese empuje equilibra su peso; importa su densidad media respecto a la del fluido.';
 }else if(id==='sky-colors'){
  if(/\b(?:noche|nocturno|nocturna|negro|negra|estrellas|verde|aurora)\b/.test(norm))return null;
  if(!/\b(?:azul|atardecer|amanecer|rojo|roja|naranja)\b/.test(norm)&&!simpler&&!/^por que(?:\s|$)/.test(norm))return null;
  reply=/\b(?:atardecer|amanecer|rojo|roja|naranja)\b/.test(norm)?'Al atardecer, la luz recorre más atmósfera y se dispersa más azul fuera de la trayectoria directa. La luz que llega desde el Sol conserva más tonos rojos y anaranjados.':simpler?'La luz del Sol tiene varios colores. El aire reparte el azul por el cielo más que el rojo, y por eso lo vemos azul.':'Las moléculas del aire dispersan la luz azul más que la roja, por eso vemos azul el cielo durante el día. No es el reflejo del mar.';
 }else{
  // These notes are useful context for the model but need more interpretation
  // for comparisons and follow-ups; this tool does not claim to resolve them.
  return null;
 }
 return reply+`\n\n[Fuente](${knowledge.sources[0].url})`;
}
