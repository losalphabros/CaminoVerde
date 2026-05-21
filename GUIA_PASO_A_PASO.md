# 🌿 Guía de instalación — Bot WhatsApp Camino Verde

## PASO 1 — Crear el Google Sheet (CRM)

1. Ve a **sheets.google.com** y crea un Sheet nuevo
2. Nómbralo: `CRM Camino Verde`
3. Renombra la pestaña inferior a: `Prospectos`
4. En la fila 1 escribe estos encabezados exactamente (uno por columna):

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fecha | Nombre | Teléfono | Colonia | Caso | Descripción | Horario | Estado CRM | Fecha Llamada | Notas | Siguiente Acción | Fecha Sig. Acción | Monto Estimado | Caso Abierto |

5. Aplica color verde (#2E7D52) a las columnas A–G (datos del bot)
6. Aplica color azul marino (#1A3A5C) a las columnas H–N (gestión del Lic.)
7. Copia el ID del Sheet desde la URL:
   `docs.google.com/spreadsheets/d/**ESTE_ES_EL_ID**/edit`

**Estados CRM recomendados para la columna H:**
- `Nuevo` — recién llegó del bot
- `Pendiente llamada` — falta contactar
- `Llamado` — ya se habló
- `En seguimiento` — caso en proceso
- `Caso cerrado` — terminó
- `No interesado` — descartado

---

## PASO 2 — Crear cuenta de servicio de Google

1. Ve a **console.cloud.google.com**
2. Crea un proyecto nuevo → nómbralo `CaminoVerdeBot`
3. Menú → **APIs y servicios** → **Habilitar APIs** → busca y activa: `Google Sheets API`
4. Ve a **Credenciales** → **Crear credencial** → **Cuenta de servicio**
5. Nombre: `bot-caminoverde` → crear
6. Clic en la cuenta de servicio creada → pestaña **Claves** → **Agregar clave** → **JSON**
7. Se descarga un archivo `.json` → guárdalo

### Compartir el Sheet con la cuenta de servicio:
- Abre el JSON → copia el valor de `"client_email"`
  (algo como `bot-caminoverde@caminoverdebot.iam.gserviceaccount.com`)
- En tu Google Sheet → **Compartir** → pega ese correo → permiso **Editor** → listo

---

## PASO 3 — Configurar Meta (WhatsApp Business API)

1. Ve a **developers.facebook.com** → crear app → tipo **Business**
2. Agrega el producto **WhatsApp** en el panel
3. En **Configuración de WhatsApp** → agrega el número `6636991338`
   - Si Meta agrega un `1` automático, bórralo y escribe: `526636991338`
4. Genera un **Token de acceso permanente**:
   - **Configuración del negocio** → **Usuarios del sistema** → **Agregar**
   - Permisos: `whatsapp_business_messaging`
   - Genera el token y cópialo (guárdalo, solo se muestra una vez)
5. Copia el **Phone Number ID** del panel de WhatsApp (es un número largo, no es el 6636...)

---

## PASO 4 — Subir el bot a Railway (gratis)

1. Crea cuenta en **github.com** (si no tienes)
2. Crea un repositorio nuevo → sube los 2 archivos: `server.js` y `package.json`
3. Ve a **railway.app** → inicia sesión con GitHub
4. **New Project** → **Deploy from GitHub repo** → selecciona tu repositorio
5. Railway despliega automáticamente y te da una URL:
   `https://camino-verde-bot-production.up.railway.app`

---

## PASO 5 — Variables de entorno en Railway

En tu proyecto Railway → pestaña **Variables** → agrega estas 5:

```
WHATSAPP_TOKEN    → token del Paso 3
PHONE_NUMBER_ID   → ID del número del Paso 3
VERIFY_TOKEN      → caminoverde2024
SPREADSHEET_ID    → ID del Sheet del Paso 1
GOOGLE_CREDS      → contenido completo del archivo JSON del Paso 2
```

Para `GOOGLE_CREDS`: abre el archivo JSON descargado, selecciona TODO el contenido y pégalo tal cual en Railway (incluyendo las llaves `{}`).

---

## PASO 6 — Conectar el webhook en Meta

1. Meta Developers → tu app → **WhatsApp** → **Configuración** → **Webhooks**
2. URL del webhook:
   `https://TU-URL-DE-RAILWAY.up.railway.app/webhook`
3. Token de verificación: `caminoverde2024`
4. Clic en **Verificar y guardar**
5. En suscripciones activa: `messages`

---

## ✅ ¡Listo! Así funciona:

```
Cliente escribe al 6636991338
        ↓
Bot responde y guía la conversación
        ↓
Datos se guardan en Google Sheet (columnas A–G)
        ↓
Lic. Sergio abre el Sheet y llena columnas H–N
        ↓
Lic. llama al cliente en el horario solicitado
```

**Tip para el Lic.:** filtra la columna H por "Nuevo" o "Pendiente llamada" cada mañana para ver quién necesita atención.

---

## Redes del despacho configuradas en el bot

- 🌐 www.LegalCaminoVerde.com
- 📘 facebook.com/legal.caminoverde
- 📸 instagram.com/legal.caminoverde
- 📍 Centro Comunitario Camino Verde Ley Cortéz (jueves 9am–12pm)
