export const liveDialogues=[
 {id:'biology-and-reference',category:'knowledge',turns:[
  {text:'Explica por qué las plantas necesitan luz, en dos frases.',must:['plantas','luz|sol','energía|fotosíntesis|azúcar|alimento'],rubric:'Explica la obtención de energía mediante fotosíntesis sin inventar funciones.'},
  {text:'¿Por qué? Dame una explicación causal, no repitas lo anterior.',must:['luz|energía|fotosíntesis'],mustNot:['reformula|reformar|index\\.html'],rubric:'Responde a por qué y conserva la referencia a las plantas.'},
  {text:'Ahora explícame por qué el hielo flota en el agua.',must:['densidad|denso'],rubric:'Cambia al hielo: su densidad es menor que la del agua líquida.'},
 ]},
 {id:'ship-example',category:'knowledge',turns:[
  {text:'¿Por qué flota un barco de acero? Responde en menos de 60 palabras.',must:['agua','empuje|densidad|desplaza|Arquímedes'],rubric:'Distingue la densidad media y el empuje del peso del acero.'},
  {text:'Dame otro ejemplo del mismo principio, sin usar barcos.',mustNot:['reformula|reformar'],rubric:'Ofrece otro ejemplo de flotación y no vuelve a explicar un barco.'},
  {text:'Resúmelo en una frase.',maxWords:40,rubric:'Resume su propio ejemplo anterior, sin inventar un tema nuevo.'},
 ]},
 {id:'business-ideas-not-html',category:'writing',turns:[
  {text:'Mi tienda se llama Brisa y vendo plantas. Dame tres ideas para publicaciones de mi tienda, sin crear una web.',must:['plantas'],rubric:'Da tres ideas de publicaciones; no produce HTML ni pretende haber publicado nada.'},
  {text:'Hazlas más breves y usa el nombre Brisa.',must:['Brisa'],maxWords:60,rubric:'Reformula esas ideas, conserva el contexto y usa el nombre correcto.'},
  {text:'Ya no se llama Brisa: mi tienda se llama Nube. Escribe una frase para anunciarla.',must:['Nube'],mustNot:['Brisa'],rubric:'Aplica la corrección y escribe una frase de anuncio.'},
 ]},
 {id:'negative-web-request',category:'intent',turns:[
  {text:'No quiero crear una página web. Solo quiero entender para qué sirve una landing.',must:['página|producto|servicio|conversión|objetivo'],rubric:'Explica el propósito de una landing sin construir una.'},
  {text:'Dame tres consejos para mejorarla.',rubric:'Ofrece consejos sobre la landing; no interpreta mejorar como generar HTML.'},
  {text:'Cambiemos de tema: dame un consejo para organizar mis apuntes.',must:['apuntes|notas|tema|carpeta|resumen'],rubric:'Cambia a organización de apuntes, sin retomar la landing.'},
 ]},
 {id:'text-summary-and-translation',category:'attachments',turns:[
  {text:'Resume este texto en una frase:\n```text\nLa cooperativa Faro cultiva plantas. Elena cuida el vivero. Los pedidos se entregan los martes.\n```',must:['Faro|cooperativa','plantas|vivero'],mustNot:['comprobaciones estáticas|fragmento \\(JS\\)|compil'],rubric:'Resume el contenido adjunto sin tratarlo como código.'},
  {text:'Tradúcelo al inglés.',must:['plants|nursery|cooperative|Tuesday'],rubric:'Traduce su resumen, no inventa otros nombres o días.'},
  {text:'¿Qué día se entregan los pedidos según el texto?',must:['martes|Tuesday'],mustNot:['lunes|miércoles|jueves|viernes'],rubric:'Recupera el martes del documento, aunque el resumen lo haya omitido.'},
 ]},
 {id:'code-explanation',category:'code',turns:[
  {text:'Explica qué hace esta función, no busques errores:\n```python\ndef sumar(a, b):\n    return a + b\n```',must:['suma|sumar|añade'],mustNot:['comprobaciones estáticas|no encontré problemas'],rubric:'Explica la suma de dos argumentos y respeta que no se pidió revisión.'},
  {text:'Muéstrame un ejemplo con 4 y 7.',must:['11'],rubric:'Relaciona los argumentos con la función y devuelve once.'},
  {text:'¿Y con -2 y 5?',must:['3'],rubric:'Continúa con la misma función y respeta el signo negativo.'},
 ]},
 {id:'integral-dialogue',category:'math',turns:[
  {text:'¿Puedes desarrollar ejercicios de integrales?',must:['integral'],rubric:'Indica el alcance y solicita un ejercicio; no inventa una web.'},
  {text:'Sí, dame tres.',exerciseCount:3,rubric:'Entiende tres ejercicios a partir del contexto inmediato.'},
  {text:'Resuelve el segundo paso a paso.',must:['x\\^3 \\+ x\\^2 - 5x \\+ C'],rubric:'Resuelve exactamente el segundo ejercicio de la lista.'},
 ]},
 {id:'corrections-and-memory',category:'context',turns:[
  {text:'Me llamo Lucía y vendo zapatos. Mi tienda se llama Alba.',rubric:'Reconoce los datos sin inventar una tarea.'},
  {text:'Mi nombre es Carla, no Lucía. Mi tienda se llama Sur. ¿Cómo me llamo y qué vendo?',must:['Carla','zapatos'],mustNot:['Lucía'],rubric:'Responde ambas partes y aplica la corrección del nombre.'},
  {text:'¿Cómo se llama mi tienda?',must:['Sur'],mustNot:['Alba'],rubric:'Usa el nombre corregido del proyecto.'},
 ]},
 {id:'json-format',category:'format',turns:[
  {text:'Responde únicamente con JSON válido: nombre Faro, cantidad 3. Usa las claves nombre y cantidad.',json:{nombre:'Faro',cantidad:3},rubric:'Entrega solo el objeto JSON válido con esos tipos y valores.'},
  {text:'Cambia únicamente la cantidad a 5 y conserva JSON válido.',json:{nombre:'Faro',cantidad:5},rubric:'Conserva el nombre y modifica solo el número.'},
  {text:'Ahora explícame en español qué significa ese JSON.',must:['Faro','5'],rubric:'Sale del formato estricto cuando se pide la explicación.'},
 ]},
 {id:'short-poem',category:'creativity',turns:[
  {text:'Escribe un poema de cuatro versos sobre la lluvia. No añadas título ni introducción.',must:['lluvia|gota|agua|nube'],lines:4,rubric:'Cuatro versos, tema lluvia, sin introducción o título.'},
  {text:'Ahora cambia la lluvia por el mar, conserva cuatro versos.',must:['mar|ola|océano'],lines:4,rubric:'Modifica el tema solicitado y conserva cuatro versos.'},
  {text:'Explica la imagen principal de tu poema en una frase.',rubric:'Se refiere al poema que realmente escribió.'},
 ]},
 {id:'typos-and-explanation',category:'spelling',turns:[
  {text:'ola elara, me esplicas porke el cielo se ve azul?',must:['luz|atmósfera|dispers|azul'],rubric:'Entiende los errores comunes y explica dispersión de la luz.'},
  {text:'aslo mas sensillo, como para un niño',rubric:'Simplifica esa explicación sin abandonar el tema.'},
  {text:'y por que al atardecer se ve rojo?',must:['luz|atmósfera|rojo|recorrido'],rubric:'Continúa con el fenómeno del atardecer.'},
 ]},
 {id:'constraints-and-plan',category:'planning',turns:[
  {text:'Tengo 30 minutos para ordenar apuntes y preparar una mochila. Dame un plan de tres pasos que quepa en ese tiempo.',must:['apuntes','mochila'],rubric:'Tres pasos con tiempos que sumen como máximo treinta minutos.'},
  {text:'Solo tengo 15 minutos. Adapta el mismo plan.',must:['15|quince'],rubric:'Aplica el nuevo límite, no añade más tareas.'},
  {text:'Cambiemos de tema: ¿cuál es la capital de Uruguay?',must:['Montevideo'],rubric:'Responde Montevideo, sin retomar el plan.'},
 ]},
];

export const validationDialogues=[
 {id:'validation-store-correction',category:'context',turns:[
  {text:'Mi cafetería se llama Aurora. Vendemos café y pan. Dame una frase de bienvenida.',must:['Aurora'],rubric:'Usa nombre y productos aportados.'},
  {text:'Corrijo: mi cafetería se llama Marea. Haz una frase más corta.',must:['Marea'],mustNot:['Aurora'],rubric:'Aplica la corrección en la reformulación.'},
 ]},
 {id:'validation-prose',category:'attachments',turns:[
  {text:'Explica este aviso con palabras sencillas:\n```txt\nEl taller Horizonte recibirá pedidos hasta el jueves y hará las entregas el sábado.\n```',must:['jueves','sábado'],mustNot:['comprobaciones estáticas'],rubric:'Interpreta un aviso y conserva ambos días.'},
  {text:'¿Cuál es el último día para pedir?',must:['jueves'],mustNot:['sábado'],rubric:'Distingue recepción de pedidos y entrega.'},
 ]},
 {id:'validation-negative-request',category:'intent',turns:[
  {text:'No generes una tienda ni código. Escribe dos ideas para vender cuadernos.',must:['cuadernos'],rubric:'Dos ideas, sin generar un prototipo.'},
  {text:'Dame otra idea distinta.',rubric:'Añade una idea nueva para cuadernos.'},
 ]},
 {id:'validation-integrals',category:'math',turns:[
  {text:'me ayudas con las integales?',must:['integral'],rubric:'Interpreta el error de escritura sin inventar una web.'},
  {text:'Ponme dos ejercicios resueltos.',exerciseCount:2,rubric:'Retoma el tema y entrega dos ejercicios resueltos.'},
 ]},
 {id:'validation-format',category:'format',turns:[
  {text:'Responde solo JSON válido con estado listo y total 7.',json:{estado:'listo',total:7},rubric:'Objeto JSON sin texto extra.'},
  {text:'Conserva el formato y cambia total a 9.',json:{estado:'listo',total:9},rubric:'Modificación concreta y conservación de valores.'},
 ]},
 {id:'validation-simple-facts',category:'knowledge',turns:[
  {text:'¿Cuál es la capital de Chile? Responde una frase.',must:['Santiago'],rubric:'Dato estable correcto y respuesta breve.'},
  {text:'Ahora dime la capital de Perú.',must:['Lima'],mustNot:['Santiago'],rubric:'Cambia correctamente el país del dato.'},
 ]},
];

// Additional coverage of grounding topics, defined before their first live run.
// These are coverage checks, not a claim of an independent general-knowledge test.
export const knowledgeDialogues=[
 {id:'grounding-seasons',category:'grounded-knowledge',turns:[
  {text:'¿Por qué en Argentina es verano cuando en España es invierno? Explícalo sin fórmulas.',must:['inclin|eje','hemisfer'],rubric:'Explica la inclinación terrestre y los hemisferios, sin atribuirlo a la distancia al Sol.'},
  {text:'¿Entonces depende de estar más cerca del Sol?',must:['no|inclin|eje'],rubric:'Corrige la hipótesis y mantiene la explicación física correcta.'},
 ]},
 {id:'grounding-water',category:'grounded-knowledge',turns:[
  {text:'¿Las nubes son vapor de agua invisible o gotas? Explica la diferencia en dos frases.',must:['gotas|cristales','vapor'],rubric:'Distingue vapor invisible de gotas o cristales que forman nubes visibles.'},
  {text:'Dame un ejemplo cotidiano de condensación.',must:['frío|fría|vaso|vidrio|espejo|gotas'],rubric:'Ejemplo correcto de vapor que pasa a líquido, sin confundirlo con evaporación.'},
 ]},
 {id:'grounding-dns',category:'grounded-knowledge',turns:[
  {text:'Explica qué hace DNS cuando escribo una dirección web, para alguien que empieza.',must:['dominio|nombre','IP|direcci'],rubric:'Relaciona el nombre con registros o direcciones IP sin confundirlo con alojamiento.'},
  {text:'¿DNS ya cifra toda mi conexión?',must:['no|cifra|HTTPS|TLS'],rubric:'No atribuye a DNS el cifrado del tráfico web.'},
 ]},
];
