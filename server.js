// ============================================================
//  Despacho Jurídico Camino Verde — Bot de WhatsApp
//  Meta WhatsApp Business Cloud API + Google Sheets CRM
//  Número del despacho: 6636991338
// ============================================================

const express = require("express");
const axios   = require("axios");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

// ── Variables de entorno (configuras en Railway) ──────────────────
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN    || "caminoverde2024";
const WHATSAPP_TOKEN  = process.env.WHATSAPP_TOKEN  || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const SPREADSHEET_ID  = process.env.SPREADSHEET_ID  || "";
const GOOGLE_CREDS    = process.env.GOOGLE_CREDS    || "{}";
const PORT            = process.env.PORT            || 3000;

// ── Catálogo de casos ─────────────────────────────────────────────
const CASOS = {
  "1": "Regularización de Predio",
  "2": "Herencia y Testamento",
  "3": "Divorcio",
  "4": "Concubinato",
  "5": "Despidos",
  "6": "Contratos",
  "7": "Manutención",
  "8": "Penal",
  "9": "Otros",
};

const MENU_CASOS = `¿Cuál es el motivo de tu consulta?

1️⃣ Regularización de Predio
2️⃣ Herencia y Testamento
3️⃣ Divorcio
4️⃣ Concubinato
5️⃣ Despidos
6️⃣ Contratos
7️⃣ Manutención
8️⃣ Penal
9️⃣ Otros

Responde con el número de tu caso.`;

const VENTANAS = {
  "1": "8:00am – 12:00pm",
  "2": "12:00pm – 4:00pm",
  "3": "4:00pm – 8:00pm",
};

// ── Mensaje de confirmación final ─────────────────────────────────
function mensajeConfirmacion(s) {
  return `✅ ¡Listo, ${s.nombre}!

📋 Caso: ${s.caso}
📍 Colonia: ${s.colonia}
📅 Llamada: El abogado te contactará en la ventana de *${s.ventana}*
📞 Al número desde el que nos escribes

También puede visitarnos *sin cita* este jueves de 9am a 12pm en el *Centro Comunitario Camino Verde Ley Cortéz*, junto al Centro de Justicia para la Mujer.

*Síguenos en redes:*
📘 Facebook: facebook.com/legal.caminoverde
📸 Instagram: instagram.com/legal.caminoverde

Gracias por comunicarse al Despacho Jurídico Camino Verde.
Le recordamos que la consulta no tiene costo. Usted ha dado el primer paso a su tranquilidad. El Lic. Sergio Hernández se comunicará en el horario deseado. Que pase buen día. 🌿

_Despacho Jurídico Camino Verde — Hernández y Asociados_`;
}

// ── Mensaje para usuarios que siguen escribiendo ──────────────────
const MENSAJE_REPETIR = `Visite nuestras redes como *@Legal.CaminoVerde* o www.LegalCaminoVerde.com`;

// ── Sesiones en memoria ───────────────────────────────────────────
const sesiones = {};

// ── Detectar caso por palabras clave ─────────────────────────────
function detectarCaso(texto) {
  const t = texto.toLowerCase();
  if (/terreno|predio|escritura|regulariz/.test(t))         return "1";
  if (/herencia|testamento|heredar|falleci/.test(t))        return "2";
  if (/divorcio|separa/.test(t))                            return "3";
  if (/concubinato|uni[oó]n libre|pareja/.test(t))         return "4";
  if (/despido|trabajo|laboral|empresa|liquidaci/.test(t))  return "5";
  if (/contrato|renta|arrendamiento|inquilino/.test(t))     return "6";
  if (/manutenci|pensi[oó]n|alimentaria|hijo/.test(t))     return "7";
  if (/penal|robo|delito|denuncia|detenido/.test(t))        return "8";
  return null;
}

// ── Google Sheets: guardar prospecto ─────────────────────────────
async function guardarEnSheets(datos) {
  try {
    const creds = JSON.parse(GOOGLE_CREDS);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const fecha = new Date().toLocaleString("es-MX", {
      timeZone: "America/Tijuana",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // Columnas: Fecha | Nombre | Teléfono | Colonia | Caso | Descripción | Horario
    //           | Estado CRM | Fecha Llamada | Notas | Siguiente Acción
    //           | Fecha Sig. Acción | Monto Estimado | Caso Abierto
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Prospectos!A:N",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          fecha,
          datos.nombre,
          datos.telefono,
          datos.colonia,
          datos.caso,
          datos.descripcion,
          datos.ventana,
          "Nuevo",        // Estado CRM
          "",             // Fecha de llamada (el Lic. llena)
          "",             // Notas de la llamada
          "",             // Siguiente acción
          "",             // Fecha siguiente acción
          "",             // Monto estimado
          "Pendiente",    // Caso abierto
        ]],
      },
    });

    console.log(`📊 Prospecto guardado: ${datos.nombre}`);
  } catch (err) {
    console.error("❌ Error guardando en Sheets:", err.message);
  }
}

// ── Enviar mensaje de WhatsApp ────────────────────────────────────
async function enviar(para, texto) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log(`[MODO TEST] → ${para}:\n${texto}\n`);
    return;
  }
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: texto },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Enviado a ${para}`);
  } catch (err) {
    console.error("❌ Error al enviar:", err.response?.data || err.message);
  }
}

// ── Lógica principal del bot ──────────────────────────────────────
async function procesarMensaje(telefono, texto) {
  const msg = texto.trim();

  if (!sesiones[telefono]) sesiones[telefono] = { paso: "bienvenida" };
  const s = sesiones[telefono];
  console.log(`📥 [${telefono}] paso=${s.paso} | msg="${msg}"`);

  // ── CONVERSACIÓN TERMINADA: solo repetir link ─────────────────
  if (s.paso === "completado") {
    return enviar(telefono, MENSAJE_REPETIR);
  }

  // ── BIENVENIDA ────────────────────────────────────────────────
  if (s.paso === "bienvenida") {
    s.paso = "esperar_caso";
    return enviar(telefono,
      `¡Hola! 👋 Bienvenido al Despacho Jurídico Camino Verde.\n\nEstoy aquí para ayudarte a agendar una llamada con el Lic. Sergio Hernández. Solo necesito unos datos rápidos.\n\n${MENU_CASOS}`
    );
  }

  // ── ELEGIR CASO ───────────────────────────────────────────────
  if (s.paso === "esperar_caso") {
    if (CASOS[msg]) {
      s.caso = CASOS[msg];
      s.paso = "esperar_nombre";
      return enviar(telefono,
        `Perfecto ✅ Tu caso es: *${s.caso}*.\n\n¿Me puedes dar tu *nombre completo*, por favor?`
      );
    }
    const detectado = detectarCaso(msg);
    if (detectado) {
      s.casoPropuesto = detectado;
      s.paso = "confirmar_caso";
      return enviar(telefono,
        `Entiendo tu situación. ¿Tu caso es sobre *${CASOS[detectado]}*?\n\nResponde *Sí* para confirmar, o escribe el número correcto:\n\n${MENU_CASOS}`
      );
    }
    return enviar(telefono,
      `No entendí bien. Por favor escribe el *número* que corresponde a tu caso:\n\n${MENU_CASOS}`
    );
  }

  // ── CONFIRMAR CASO DETECTADO ──────────────────────────────────
  if (s.paso === "confirmar_caso") {
    if (/^s[ií]$/i.test(msg)) {
      s.caso = CASOS[s.casoPropuesto];
      s.paso = "esperar_nombre";
      return enviar(telefono,
        `Perfecto ✅ Tu caso es: *${s.caso}*.\n\n¿Me puedes dar tu *nombre completo*, por favor?`
      );
    }
    if (CASOS[msg]) {
      s.caso = CASOS[msg];
      s.paso = "esperar_nombre";
      return enviar(telefono,
        `Entendido ✅ Tu caso es: *${s.caso}*.\n\n¿Me puedes dar tu *nombre completo*, por favor?`
      );
    }
    return enviar(telefono,
      `Por favor responde *Sí* para confirmar, o escribe el número de tu caso:\n\n${MENU_CASOS}`
    );
  }

  // ── NOMBRE ────────────────────────────────────────────────────
  if (s.paso === "esperar_nombre") {
    if (msg.length < 3) {
      return enviar(telefono, "Por favor escribe tu nombre completo para continuar.");
    }
    s.nombre = msg;
    s.paso   = "esperar_colonia";
    return enviar(telefono,
      `Mucho gusto, *${s.nombre}* 😊\n\n¿En qué *colonia o área* vives o tienes el problema?`
    );
  }

  // ── COLONIA ───────────────────────────────────────────────────
  if (s.paso === "esperar_colonia") {
    if (msg.length < 2) {
      return enviar(telefono, "Por favor indícame la colonia o área.");
    }
    s.colonia = msg;
    s.paso    = "esperar_descripcion";
    return enviar(telefono,
      `Gracias ✅\n\nCuéntame brevemente tu situación (en 2 o 3 oraciones). Esto es para que el abogado llegue preparado a la llamada.`
    );
  }

  // ── DESCRIPCIÓN ───────────────────────────────────────────────
  if (s.paso === "esperar_descripcion") {
    if (msg.length < 10) {
      return enviar(telefono, "Por favor dame un poco más de detalle para que el abogado pueda ayudarte mejor.");
    }
    s.descripcion = msg;
    s.paso        = "esperar_ventana";
    return enviar(telefono,
      `Anotado 📝\n\n¿En qué horario prefieres que el abogado te llame?\n\n1️⃣ 8:00am – 12:00pm\n2️⃣ 12:00pm – 4:00pm\n3️⃣ 4:00pm – 8:00pm\n\nResponde con 1, 2 o 3.`
    );
  }

  // ── VENTANA HORARIA ───────────────────────────────────────────
  if (s.paso === "esperar_ventana") {
    if (!VENTANAS[msg]) {
      return enviar(telefono, "Por favor responde con *1*, *2* o *3* para elegir tu horario.");
    }
    s.ventana  = VENTANAS[msg];
    s.telefono = telefono;
    s.paso     = "completado";

    await guardarEnSheets(s);
    return enviar(telefono, mensajeConfirmacion(s));
  }
}

// ── Webhook: verificación de Meta ────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Webhook: recibir mensajes ─────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return;
    const msg      = messages[0];
    const telefono = msg.from;
    const texto    = msg.type === "text" ? msg.text.body : null;
    if (!texto) return;
    await procesarMensaje(telefono, texto);
  } catch (err) {
    console.error("❌ Error procesando webhook:", err.message);
  }
});

// ── Health check ──────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Bot Camino Verde activo ✅"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`🚀 Bot corriendo en puerto ${port}`));
