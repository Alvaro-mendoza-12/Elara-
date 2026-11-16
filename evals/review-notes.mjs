// Human-readable review of complete saved outputs. Not the model judging itself.
// pass = correct and fulfills the request; partial = useful but misses a constraint
// or has ambiguous wording; fail = wrong, off-topic or violates a key instruction;
// transport = no complete answer. The recorder binds every grade to its output hash.
export const reviews={
 final:{
  'biology-and-reference':[['pass','Dos frases pertinentes con fuente sobre fotosíntesis.'],['pass','Mantiene la referencia y explica el papel causal de la clorofila.'],['pass','Relaciona correctamente estructura, volumen y densidad del hielo.']],
  'ship-example':[['pass','Explica equilibrio de empuje y peso y densidad media del casco.'],['pass','Aplica correctamente Arquímedes a un globo de helio.'],['pass','Resume el ejemplo anterior en una frase; mayúscula tras punto y coma mejorable.']],
  'business-ideas-not-html':[['partial','Da tres propuestas pertinentes, pero añade un comentario innecesario sobre no inventar órdenes.'],['partial','Repite exactamente el texto; la petición de abreviar no se cumple.'],['partial','Usa Nube y plantas, pero entrega tres fragmentos en lugar de una frase publicitaria.']],
  'negative-web-request':[['partial','Define una landing sin generar HTML; presenta un producto como ejemplo de llamada a la acción.'],['pass','Da tres consejos pertinentes para la landing.'],['partial','Cambia al tema de los apuntes, pero añade formulaciones confusas y una pregunta innecesaria.']],
  'text-summary-and-translation':[['partial','Conserva el martes, pero atribuye a Elena todas las labores de cultivo y entrega.'],['fail','Traduce instrucciones sobre su comportamiento en lugar del texto fuente.'],['pass','Recupera correctamente el martes del documento.']],
  'code-explanation':[['pass','Explica la suma sin revisar errores no pedidos.'],['pass','Da once para cuatro más siete.'],['pass','Da tres para menos dos más cinco.']],
  'integral-dialogue':[['pass','Delimita el alcance y ofrece integrales polinómicas verificables.'],['pass','Entrega los tres ejercicios pedidos mediante la referencia contextual.'],['pass','Resuelve el segundo con pasos verificables y constante.']],
  'corrections-and-memory':[['pass','Reconoce nombre, tienda y producto sin inventar una tarea.'],['pass','Responde ambas partes con Carla y zapatos.'],['pass','Recuerda la corrección Sur.']],
  'json-format':[['pass','JSON válido con claves, tipos y valores pedidos.'],['pass','Mantiene Faro y cambia solo cantidad a cinco.'],['fail','Inventa que cantidad significa número de menciones.']],
  'short-poem':[['pass','Cuatro versos pertinentes sin título.'],['pass','Cambia al mar y conserva cuatro versos; estilo mejorable.'],['pass','Interpreta la imagen marítima en una frase.']],
  'typos-and-explanation':[['pass','Interpreta las erratas y explica dispersión con fuente.'],['pass','Simplifica conservando el referente y el fenómeno.'],['pass','Explica correctamente el recorrido y la dispersión al atardecer.']],
  'constraints-and-plan':[['fail','No propone los tres pasos y pide horas pese a recibir treinta minutos.'],['fail','Ignora los quince minutos e inventa una dificultad con datos privados.'],['transport','No completa la respuesta porque otro usuario ocupa la única ranura.']],
 },
 validation:{
  'validation-store-correction':[['partial','Es una bienvenida pertinente, pero inventa entrega a domicilio.'],['pass','Usa el nombre corregido Marea y abrevia.']],
  'validation-prose':[['fail','Inventa días y fechas distintos de jueves y sábado.'],['fail','Propaga el miércoles incorrecto en lugar del jueves del documento.']],
  'validation-negative-request':[['partial','Evita HTML, pero una donación no es vender y solicita datos de marca innecesarios.'],['fail','Repite las propuestas y da dos cuando se pidió otra distinta.']],
  'validation-integrals':[['pass','Reconoce la errata y delimita la capacidad de integrales.'],['pass','Entrega dos ejercicios con resultados verificables y pasos.']],
  'validation-format':[['pass','JSON válido con estado listo y total siete.'],['pass','Conserva JSON y cambia total a nueve.']],
  'validation-simple-facts':[['pass','Responde Santiago de forma breve.'],['pass','Cambia a la capital de Perú y responde Lima.']],
 },
 grounding:{
  'grounding-seasons':[['fail','Atribuye estaciones opuestas a distancia al Sol pese a la nota correcta.'],['fail','Confirma la premisa falsa sobre distancia al Sol.']],
  'grounding-water':[['pass','Distingue correctamente gotas o cristales visibles del vapor gaseoso.'],['partial','El ejemplo de vaso caliente y niebla es ambiguo y no explica claramente condensación del vapor.']],
  'grounding-dns':[['partial','La traducción de nombres es pertinente, pero añade IP interna y una analogía confusa.'],['pass','Distingue resolución DNS de cifrar toda la conexión; error gramatical menor.']],
 },
 repeat:{
  'business-ideas-not-html':[['pass','Entrega tres propuestas breves de publicaciones.'],['partial','Abrevia, pero cambia Cultiva a Cultura y altera el significado.'],['pass','Usa el nombre corregido Nube en una frase.']],
  'corrections-and-memory':[['pass','Reconoce correctamente Lucía, Alba y zapatos.'],['pass','Aplica la corrección Carla conservando zapatos.'],['pass','Recupera el nombre corregido Sur.']],
 },
 'timeout-baseline':{
  'joke-clean':[['fail','No cuenta un chiste; pregunta por datos privados y cambia cuentos por chistes.']],
  'joke-long-history':[['transport','El historial largo agota el plazo sin texto.']],
  'joke-new-specific-topic':[['fail','La narración menciona programación, pero carece de remate o sentido humorístico comprensible.']],
  'joke-topic-followup':[['partial','Mantiene el robot como tema, pero el remate es débil e incompleto.']],
 },
 'timeout-fixed':{
  'joke-clean':[['fail','Entrega una narración violenta e incoherente sin un chiste comprensible.']],
  'joke-long-history':[['fail','Pregunta al usuario qué chiste cuenta en lugar de responder.']],
  'joke-new-specific-topic':[['fail','Repite una instrucción del sistema y no cuenta un chiste de programadores.']],
  'joke-topic-followup':[['partial','Da un breve juego sobre un robot quemado; pertinencia conservada y humor débil.']],
 },
 'followup-check':{
  'business-ideas-not-html':[['pass','Da tres ideas pertinentes, sin HTML ni acciones realizadas.'],['partial','Acorta, pero convierte propuestas en acciones futuras ya decididas y conserva detalles innecesarios.'],['partial','Usa Nube y plantas, pero inventa una colección nueva y exótica.']],
  'text-summary-and-translation':[['partial','Conserva vivero y martes, pero cambia entregas por llegadas.'],['fail','No traduce al inglés y agrega su identidad.'],['pass','Recupera correctamente martes del texto original.']],
  'json-format':[['fail','Claves y valor de texto sin comillas: no es JSON válido.'],['fail','Cambia el número, pero mantiene el formato inválido.'],['fail','Confunde claves con valores y retrocede a tres pese a la corrección a cinco.']],
  'short-poem':[['pass','Cuatro versos sobre lluvia sin título ni introducción.'],['pass','Cuatro versos sobre mar, sin conservar el tema anterior.'],['partial','Repite todo el poema en dos frases en lugar de interpretar la imagen en una.']],
  'constraints-and-plan':[['partial','Da tres pasos, pero uno irrelevante sobre datos del chat y no reparte los treinta minutos.'],['fail','Repite el plan sin adaptarlo a quince minutos.'],['pass','Cambia de tema y responde Montevideo.']],
 },
 'memory-probe':{
  'biology-and-reference':[
   ['pass','Dos frases correctas sobre fotosíntesis, con fuente.'],
   ['pass','Explicación causal coherente con la referencia anterior, con fuente.'],
   ['pass','Explica correctamente densidad y estructura del hielo, con fuente.'],
  ],
  'ship-example':[
   ['pass','Explica el empuje y la densidad media con su fuente.'],
   ['pass','Ejemplo correcto de un globo de helio que puede subir en el aire.'],
   ['pass','Resume el ejemplo real anterior en una frase.'],
  ],
  'business-ideas-not-html':[
   ['transport','La generación de las ideas queda incompleta por vencimiento del plazo.'],
   ['partial','Pide el texto para abreviar después del fallo anterior; no se completa la conversación.'],
   ['pass','Entrega una frase breve con el nombre corregido Nube.'],
  ],
  'negative-web-request':[
   ['pass','Explica el propósito de la landing sin crear HTML.'],
   ['pass','Tres consejos pertinentes para la landing.'],
   ['partial','Se adapta al nuevo tema, pero entrega cuatro consejos cuando se pidió uno.'],
  ],
  'text-summary-and-translation':[
   ['transport','El resumen parcial no termina antes del plazo.'],
   ['partial','Pide el texto tras el error anterior; no entrega la traducción solicitada.'],
   ['transport','El día correcto aparece, pero la respuesta queda marcada como incompleta.'],
  ],
  'code-explanation':[
   ['transport','La explicación queda incompleta; además añade una revisión no pedida.'],
   ['transport','La salida once aparece, pero el stream no termina correctamente.'],
   ['transport','La respuesta queda truncada antes de dar el resultado de menos dos más cinco.'],
  ],
  'integral-dialogue':[
   ['pass','Delimita la capacidad matemática y pide un ejercicio.'],
   ['pass','Reconoce la cantidad desde el contexto y entrega tres ejercicios.'],
   ['pass','Resuelve el segundo polinomio con pasos y constante de integración.'],
  ],
 },
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
