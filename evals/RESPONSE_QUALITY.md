# Evaluación de coherencia de respuestas

Objetivo: responder a lo que pide el usuario, mantener el referente correcto y usar herramientas solo cuando corresponden. Línea base: commit 2294c49.

Se definen 1.200 escenarios sintéticos, repartidos en veinte familias. Cada familia contiene sesenta casos distintos: 48 de desarrollo y doce reservados para validación. La huella del historial completo debe ser única. Se versionan el catálogo, los criterios y los resultados; los criterios se fijan antes de cambiar el motor.

Las comprobaciones rápidas evalúan enrutamiento, resultados de herramientas, conservación de contexto, negaciones, ausencia de HTML no solicitado y límites de datos. Un caso que deriva correctamente al modelo no cuenta como una respuesta generada correctamente por ese modelo. Los resultados del modelo se miden por separado con conversaciones reales, pausas entre peticiones, una sola solicitud activa y sin aumentar las cuotas del servidor.

Se verificará calidad abierta mediante requisitos concretos y revisión del texto completo: pertinencia, seguimiento de instrucciones, hechos aportados por el usuario y ausencia de acciones o datos inventados. No se utiliza el mismo modelo pequeño como juez de sí mismo. Los casos ambiguos se registran para revisión y no se arregla un criterio para convertir una respuesta incorrecta en un acierto.

La muestra en vivo incluye preguntas cotidianas, aprendizaje, escritura, formatos, referencias, cambios de tema, correcciones, límites de información y conversaciones con adjuntos. Los historiales de una conversación incorporan las respuestas reales de sus turnos anteriores. Se registran errores, tiempos, motor utilizado y respuestas, con datos sintéticos. La cuenta de prueba se cierra y se retira al finalizar.

No se promete una tasa de acierto general a partir de esta muestra. La evaluación no entrena los pesos, no demuestra superioridad frente a otros modelos y no sustituye una evaluación clínica o de seguridad. Los fallos de capacidades no soportadas se distinguen de desvíos de tema y de fallos del transporte.
