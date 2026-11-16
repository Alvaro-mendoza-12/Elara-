# Acceso real con Novvin

La versión 0.5 sustituye el perfil local ficticio por autenticación contra la API Ubuntu de Novvin. `Continuar con Novvin` abre un formulario que acepta el correo y la contraseña existentes. También permite registrar una cuenta real compartida con Novvin. El segundo factor se solicita cuando Novvin lo exige.

No es OAuth/SSO: no reutiliza automáticamente la sesión de novvinapp.com. No se han inventado endpoints OAuth que Novvin no expone. La integración se apoya en `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/web-session/refresh` y `DELETE /v1/auth/web-session`.

El BFF Next.js conserva la credencial de renovación en una cookie cifrada de Elara y solicita una sesión web etiquetada `ELARA Web` al servidor existente. No expone accessToken ni refreshToken en respuestas JSON. La verificación vuelve a consultar la sesión al abrir la app, enfocar la ventana y enviar chat desde una sesión autenticada. Logout revoca la sesión en Ubuntu y borra la cookie de Elara.

La recuperación abre https://novvinapp.com/login, donde se mantiene el proceso existente. Esta entrega no valida SMTP ni recuperación completa de una cuenta del propietario. Tampoco valida con una cuenta de segundo factor real; implementa el contrato y su formulario, sin declarar un recorrido no probado.

La persistencia de las conversaciones es local al navegador y no depende del perfil. Iniciar sesión no las sube ni sincroniza. Un dispositivo compartido puede conservar el historial: puede exportarse y vaciarse desde la barra lateral.

`ELARA_SESSION_SECRET` se configuró como variable sensible de producción en Vercel. La credencial no se incorpora a Git. `NOVVIN_API_URL` permite seleccionar el backend HTTPS en entornos propios.
