# Consulta de integrales y respuestas interrumpidas

La consulta reportada fue «puedes desarrollar ejercicios de integrales?». La captura mostraba una afirmación de haber generado un index.html con cinco ejercicios, un fragmento sin terminar y un error. El usuario informó una espera aproximada de dos minutos.

Se reprodujo el error de enrutamiento: la pregunta, y otras formulaciones con “integrales” en plural, caían en el modelo general. No se dispone de una traza de aquella solicitud para reconstruir su tiempo o la carga histórica del servidor. La comprobación actual encontró el modelo y Novvin disponibles; no se atribuye la demora pasada a saturación sin evidencia.

## Correcciones

- Las consultas de capacidad sobre integrales reciben una respuesta directa de Core que solicita el ejercicio. No invocan al modelo general, no inventan un número de ejercicios y no convierten la pregunta en una web.
- Las peticiones explícitas de ejercicios generan de uno a cinco polinomios de práctica, con soluciones y desarrollo por términos cuando se solicitan. «Resuelve el segundo» utiliza la lista que se acaba de entregar. El calculador sigue acotado a polinomios en x de grado máximo doce, sin límites de integración; las expresiones no soportadas reciben una explicación de esa limitación.
- Las herramientas públicas de matemáticas responden antes de consultar la sesión remota de Novvin, también al seleccionar Conversación. Siguen validados el origen, el esquema y los límites del cuerpo. El modelo general conserva su requisito de cuenta verificada.
- Las conversaciones normales envían una selección de hasta ocho turnos, con presupuesto de 3.600 caracteres para las peticiones habituales y los límites mayores ya existentes para entradas largas. Se mantienen los datos explícitos resumidos del usuario. No aumentan CPU, RAM, contexto de llama.cpp ni concurrencia del servidor.
- Una pregunta de capacidad debe responder a la capacidad pedida. Las instrucciones del modelo refuerzan que no afirme haber creado archivos y que la generación de prototipos corresponde a Core.
- Las nuevas respuestas con error, desconexión, cancelación o finalización por límite se marcan como incompletas. No se muestran como un archivo entregado, no abren un visor automático y se excluyen del contexto de la siguiente consulta. Su estado se conserva en el historial local y la exportación lo indica. No se borró el historial antiguo del usuario.

## Límites de espera

| Etapa | Límite |
|---|---:|
| Verificar Novvin para una consulta al modelo | 7 s |
| Primera salida del modelo | 30 s |
| Pausa entre fragmentos del modelo | 10 s |
| Generación total del modelo | 38 s |
| Solicitud completa del chat en servidor | 42 s |
| Petición completa en el cliente, incluidas cabeceras y cuerpo | 45 s |

No se reintenta automáticamente la generación. El SDK emite algunos vencimientos como fragmentos abort; se convierten en un aviso de tiempo agotado cuando no proceden de una cancelación del usuario. El límite del cliente abarca toda la lectura del stream, no solo la llegada de cabeceras. Estos son límites de ejecución de la aplicación, sujetos al funcionamiento del navegador, la conexión y el host; no una garantía universal de latencia.

## Validación previa a publicación

Pasaron 73 pruebas, lint y build. Doce casos nuevos cubren la consulta exacta, formulaciones relacionadas, contexto después de una web, ejercicios y referencias, límites matemáticos, cabeceras y cuerpo bloqueados, cancelación manual, limpieza de temporizadores y exclusión de respuestas parciales.

Las pruebas de integración utilizan los SDK instalados de chat y de modelo: una respuesta con texto parcial seguida de error, una respuesta truncada por tokens frente a una completa y un proveedor que envía texto y después deja de responder. Se comprobó que la petición se aborta y que el aviso de timeout llega mediante el protocolo de la interfaz.

El script scripts/check-integral-help.mjs comprueba el circuito HTTP público y registra el tiempo de ocho casos, incluida la consulta reportada en Automático y Conversación sin sesión. Solo utiliza entradas sintéticas y no imprime credenciales.

## Publicación y resultados

Código publicado: `aad71e1`, despliegue `dpl_A1HeULxFkRs15GDzGF8NTvCJ5eE6`, confirmado **Ready** en [Elara](https://elara-mu-mauve.vercel.app).

Los ocho casos HTTP de integrales pasaron con respuestas completas y motor Core. En la primera publicación, la pregunta exacta tardó 1,3 segundos. Tras la publicación final, la primera solicitud tardó 5,1 segundos y las siguientes del conjunto entre 0,44 y 1,04 segundos. La misma pregunta en Conversación tardó 0,46 segundos; después de un catálogo anterior, 0,45 segundos. No se generó HTML. Son mediciones puntuales de solicitudes completas, no una garantía de latencia ni una identificación del origen de la demora histórica.

La expresión `∫ (3x^2 + 2x - 5) dx paso a paso` devolvió `x^3 + x^2 - 5x + C`, con los tres términos desarrollados. La petición de tres ejercicios entregó exactamente tres; la referencia al segundo resolvió ese polinomio. La expresión no soportada recibió una explicación del alcance del calculador.

También pasaron las 21 comprobaciones de acceso, perfil, persistencia, logout, revocación y validación. Después del ajuste final, los cuatro casos de continuidad se aprobaron en la dirección pública: las dos generaciones de Conversación tardaron 21,9 y 15,5 segundos; las respuestas deterministas, unos 0,44 segundos. Una prueba previa había agotado el primer margen de 22 segundos, por lo que se redujo el contexto reciente a ocho turnos y se dio un margen inicial de 30 segundos dentro de los límites totales de 42/45 segundos. No se amplió la capacidad de hardware.

Al terminar se cerró la sesión sintética y se retiraron exactamente su cuenta, un registro de avatar y un archivo. La comprobación posterior confirmó cero cuentas restantes dentro de ese alcance. Novvin siguió respondiendo HTTP 200; el modelo estaba en reposo y consumía unos 1,37 GiB dentro de su límite de 3 GiB. No se utilizaron credenciales del propietario ni se cambiaron servicios de Novvin.
