// Human-readable review of complete saved outputs. Not the model judging itself.
// pass = correct and fulfills the request; partial = useful but misses a constraint
// or has ambiguous wording; fail = wrong, off-topic or violates a key instruction;
// transport = no complete answer. The recorder binds every grade to its output hash.
export const reviews={
 'prompt-probe':{
  'biology-and-reference':[
   ['partial','Contenido correcto, pero entrega una frase en lugar de las dos pedidas.'],
   ['pass','Explica la referencia causal de fotosíntesis y mantiene el tema.'],
   ['partial','La densidad se explica correctamente, pero entrega JSON con metadatos inventados que nadie pidió.'],
  ],
  'ship-example':[
   ['fail','Empieza con el equilibrio correcto pero luego afirma que el casco reduce el peso y desplaza menos peso que el barco.'],
   ['partial','Apunta al aire desplazado, pero compara cantidad de aire con peso sin precisar unidades ni el empuje.'],
   ['partial','Conserva la idea del ejemplo, pero sigue una formulación física imprecisa y entrega JSON no solicitado.'],
  ],
  'business-ideas-not-html':[
   ['partial','Tres ideas pertinentes para plantas, presentadas en JSON no solicitado.'],
   ['partial','Reformula las tres ideas con Brisa, pero entrega JSON no solicitado y mal formado.'],
   ['transport','La entrada con borradores anteriores supera el plazo; no entrega la frase.'],
  ],
  'negative-web-request':[
   ['pass','Explica la landing sin generar una web.'],
   ['pass','Tres consejos pertinentes para la misma landing.'],
   ['partial','El consejo sobre apuntes es pertinente, pero aparece en JSON no solicitado.'],
  ],
  'text-summary-and-translation':[
   ['partial','Conserva cooperativa, vivero, plantas y martes, pero atribuye un propósito de entrega a Elena que el original no especifica.'],
   ['fail','Cambia el nombre Faro por Farco y añade JSON no solicitado.'],
   ['pass','Recupera correctamente el martes del documento original.'],
  ],
  'code-explanation':[
   ['partial','La descripción básica de sumar es pertinente, pero el resultado aparece en JSON no solicitado.'],
  ],
 },
 'latency-probe':{
  'biology-and-reference':[
   ['partial','Explicación causal correcta basada en la nota, pero entrega una frase en lugar de dos.'],
   ['pass','Mantiene la referencia a las plantas y explica la captura de luz y la producción de azúcares.'],
   ['transport','La entrada incluye notas redundantes y contexto anterior; vence el plazo sin texto.'],
  ],
  'ship-example':[
   ['pass','Explica correctamente el equilibrio entre empuje del agua y peso, y la densidad media del casco con aire.'],
   ['pass','Da globo de helio y submarino como ejemplos pertinentes de Arquímedes.'],
   ['pass','Resume su explicación anterior sin añadir otro tema ni repetir los errores físicos de la línea base.'],
  ],
  'business-ideas-not-html':[
   ['transport','La verificación remota de Novvin supera los siete segundos de la primera versión.'],
   ['partial','Pide el texto que debe abreviar, lo cual es coherente tras el error anterior; la conversación no completa el objetivo.'],
   ['pass','Escribe una frase con el nombre corregido Nube y el producto plantas.'],
  ],
  'negative-web-request':[
   ['pass','Explica el propósito de una landing sin generar HTML.'],
   ['pass','Da tres consejos pertinentes sin convertirlos en una web.'],
  ],
 },
 baseline:{
  'biology-and-reference':[
   ['partial','Explicación útil, pero confunde la energía captada con los productos materiales y llama al oxígeno vital para el crecimiento sin precisar su función.'],
   ['transport','HTTP 503; la versión inicial del evaluador no guardó la causa concreta.'],
   ['partial','Apunta a la estructura cristalina y al volumen, pero «densa masa» y «menos pesada» confunden masa y densidad.'],
  ],
  'ship-example':[
   ['fail','Afirma que un barco flota sin necesidad de agua y atribuye el empuje al aire del casco.'],
   ['fail','Confunde densidad del material del globo con densidad media, inventa un ejemplo de espuma de sándwich y explica mal la sustentación de un avión.'],
   ['fail','El resumen conserva la explicación falsa del globo y del barco.'],
  ],
  'business-ideas-not-html':[
   ['fail','Pide productos para una tienda web en lugar de las tres ideas de publicaciones solicitadas.'],
   ['fail','Genera HTML no solicitado cuando se pide abreviar ideas.'],
   ['transport','La generación queda incompleta y vence el plazo; no entrega la frase pedida.'],
  ],
  'negative-web-request':[
   ['fail','Genera una web pese a que el usuario pidió explícitamente no crearla.'],
   ['pass','Tres consejos pertinentes para mejorar una landing.'],
   ['transport','HTTP 503; no entrega respuesta al nuevo tema.'],
  ],
  'text-summary-and-translation':[
   ['fail','Trata el documento de texto como JavaScript y no resume su contenido.'],
   ['fail','Traduce su revisión equivocada en vez del documento o su resumen.'],
   ['transport','HTTP 503; no recupera el día del documento.'],
  ],
  'code-explanation':[
   ['fail','Revisa errores aunque se pidió explicar una suma sin buscar errores.'],
   ['partial','Muestra una llamada válida a sumar(4,7), pero omite la salida once.'],
   ['fail','Devuelve menos dos en vez de tres; tomó parte de la frase como una expresión independiente.'],
  ],
  'integral-dialogue':[
   ['pass','Reconoce la capacidad solicitada y delimita el alcance.'],
   ['fail','Entiende la petición de tres ejercicios, pero el tercero tiene signo incorrecto: la primitiva de exp(-x) es -exp(-x).'],
   ['partial','El resultado de su segundo ejercicio real es correcto; el primer paso sobre derivar seno no es un desarrollo claro de la integración.'],
  ],
  'corrections-and-memory':[
   ['pass','Reconoce nombre, negocio y producto sin inventar una tarea.'],
   ['partial','Corrige el nombre a Carla pero omite responder qué vende.'],
   ['pass','Recupera el nombre corregido Sur.'],
  ],
  'json-format':[
   ['pass','Objeto JSON válido con las claves, tipos y valores pedidos.'],
   ['pass','Conserva Faro y cambia solamente cantidad a cinco.'],
   ['fail','Inventa tres faros y una limitación sobre documentos privados al explicar el JSON.'],
  ],
  'short-poem':[
   ['pass','Entrega cuatro versos sobre lluvia sin título.'],
   ['partial','Conserva cuatro versos y cambia al mar, pero contiene la frase agramatical «sin fin y vastas».'],
   ['partial','Menciona imágenes del poema pero mezcla la lluvia y despertar la tierra del poema anterior.'],
  ],
  'typos-and-explanation':[
   ['fail','Responde con su identidad y capacidades, no a la pregunta sobre el cielo.'],
   ['fail','Explica el azul mediante absorción del rojo; el fenómeno pertinente es dispersión.'],
   ['fail','La explicación de absorción, colores que supuestamente quedan y aspecto rojo es falsa y contradictoria.'],
  ],
  'constraints-and-plan':[
   ['partial','Tres pasos pertinentes, pero no reparte los treinta minutos ni demuestra que quepan.'],
   ['fail','Asigna los quince minutos a los apuntes y deja la mochila para después del límite.'],
   ['pass','Responde correctamente Montevideo y deja el tema anterior.'],
  ],
 },
};
