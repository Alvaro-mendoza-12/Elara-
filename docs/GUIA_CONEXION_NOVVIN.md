# Acceso de Novvin en Elara 0.7

Iniciar sesión ofrece continuar como invitado o usar Novvin. El formulario acepta el correo y contraseña existentes y el segundo factor cuando Novvin lo solicita. Crear una cuenta abre directamente https://novvinapp.com/register; Elara no mantiene otro registro separado. La recuperación y el perfil abren la página oficial de Novvin.

La integración usa `/v1/auth/login`, `/v1/auth/web-session/refresh` y `DELETE /v1/auth/web-session`. No es OAuth ni comparte automáticamente una cookie de novvinapp.com. Tras iniciar o cerrar sesión, Elara recarga la página y vuelve a verificar la identidad antes de abrir el historial.

El BFF conserva únicamente la credencial de renovación dentro de una cookie cifrada HttpOnly. No entrega accessToken ni refreshToken al cliente. Verifica la sesión al abrir la app, enfocar la ventana y atender una petición autenticada. El cierre revoca la sesión exacta del navegador en Ubuntu antes de borrar su cookie.

El perfil público incluye nombre, identificador, correo y avatar autorizado. La lectura de perfil contempla el ID local y el ID importado de Novvin. `avatar_media_type` diferencia imagen, GIF y video; la ruta protegida de Elara reenvía las peticiones de rango para videos. Se rechazan propietarios distintos, rutas ajenas al bucket y medios no admitidos. El proveedor se identifica con el logo oficial de Novvin.

Los historiales se guardan por cuenta en este navegador. El invitado utiliza otra clave y no hereda el chat de la cuenta al cerrar sesión. Iniciar sesión no sube las conversaciones a Novvin y todavía no ofrece sincronización entre dispositivos. Los mensajes locales del formato antiguo se conservan sin atribuirlos automáticamente a una identidad.

La entrega se valida con cuentas sintéticas y avatars de prueba, incluyendo video con respuesta HTTP 206 y reproducción en el navegador. No se ha probado la contraseña del propietario, una cuenta real con segundo factor ni todo el circuito de recuperación por correo; esos casos no se presentan como comprobados.

`ELARA_SESSION_SECRET` y la clave del runtime están configurados como secretos de servidor en Vercel. Ninguno se incorpora a Git. `NOVVIN_API_URL` permite seleccionar un backend HTTPS propio para entornos autorizados.
