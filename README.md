# ConciertosSV - sitio web administrable

Este proyecto es una web lista para personalizar con:

- Página pública con tus redes sociales
- Sección de próximos eventos
- Sección de productoras con enlace directo a Instagram
- Panel privado de administración
- Inicio de sesión protegido por usuario y contraseña
- Base de datos SQLite para guardar cambios

## Acceso inicial

- Usuario: `admin`
- Contraseña: `admin12345`

Cámbiala apenas entres al panel.

## Cómo ejecutarlo

1. Instala Node.js 20 o superior.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta:

```bash
npm install
npm start
```

4. Abre `http://localhost:3000`

## Despliegue recomendado

Puedes subirlo a:

- Render
- Railway
- VPS con Node.js
- Hosting propio con PM2 y Nginx

## Variables recomendadas

Crea estas variables en producción:

- `PORT`
- `SESSION_SECRET`

## Sobre la información de Instagram

La parte automática de "tomar los próximos eventos desde Instagram" no está incluida como scraping automático porque Instagram y Facebook limitan el acceso automatizado y normalmente exigen usar APIs oficiales y cuentas profesionales para integraciones estables.

Por eso este proyecto queda preparado de esta forma:

- Tú publicas en Instagram
- En el panel privado agregas o corriges los eventos
- También agregas las productoras y sus perfiles de Instagram

## Mejora futura sugerida

Si quieres automatizarlo de verdad, el siguiente paso sería integrar:

- Meta Instagram Graph API
- Una cuenta profesional vinculada a Meta
- Un proceso de sincronización que lea publicaciones autorizadas y las convierta en eventos borrador

## Estructura

- `server.js`: servidor principal
- `views/`: plantillas EJS
- `public/`: estilos
- `data/site.db`: base de datos SQLite

