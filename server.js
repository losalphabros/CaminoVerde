// ============================================================
//  Despacho Juridico Camino Verde - Bot de WhatsApp
//  Meta WhatsApp Business Cloud API + Google Sheets CRM
//  Numero del despacho: 6636991338
// ============================================================

const express = require("express");
const axios   = require("axios");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

// Variables de entorno
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN    || "caminoverde2024";
const WHATSAPP_TOKEN  = process.env.WHATSAPP_TOKEN  || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const SPREADSHEET_ID  = process.env.SPREADSHEET_ID  || "";
const GOOGLE_CREDS    = process.env.GOOGLE_CREDS    || "{}";
const PORT            = process.env.PORT            || 3000;

// Numero personal del Lic. Sergio
const LIC_NUMERO = "526645365944";

// Catalogo de casos
const CASOS = {
  "1": "Regularizacion de Predio",
  "2": "Herencia y Testamento",
  "3": "Divorcio",
  "4": "Concubinato",
  "5": "Despidos",
  "6": "Contratos",
  "7": "Manutenci\u00f3n",
  "8": "Penal",
  "9": "Otros",
};

const MENU_CASOS = `\u00bfCu\u00e1l es el motivo de tu consulta?

1\ufe0f\u20e3 Regularizaci\u00f3n de Predio
2\ufe0f\u20e3 Herencia y Testamento
3\ufe0f\u20e3 Divorcio
4\ufe0f\u20e3 Concubinato
5\ufe0f\u20e3 Despidos
6\ufe0f\u20e3 Contratos
7\ufe0f\u20e3 Manutenci\u00f3n
8\ufe0f\u20e3 Penal
9\ufe0f\u20e3 Otros

Responde con el n\u00famero de tu caso.`;

const VENTANAS = {
  "1": "8:00am - 12:00pm",
  "2": "12:00pm - 4:00pm",
  "3": "4:00pm - 8:00pm",
};

// Mensaje de confirmacion final al cliente
function mensajeConfirmacion(s) {
  return `\u2705 \u00a1Listo, ${s.nombre}!\n\n\ud83d\udccb Caso: ${s.caso}\n\ud83d\udccd Colonia: ${s.colonia}\n\ud83d\udcc5 Llamada: El abogado te contactar\u00e1 en la ventana de *${s.ventana}*\n\ud83d\udcde Al n\u00famero desde el que nos escribes\n\nTambi\u00e9n puede visitarnos *sin cita* este jueves de 9am a 12pm en el *Centro Comunitario Camino Verde Ley Cort\u00e9z*, junto al Centro de Justicia para la Mujer.\n\n*S\u00edguenos en redes:*\n\ud83d\udcd8 Facebook: facebook.com/legal.caminoverde\n\ud83d\udcf8 Instagram: instagram.com/legal.caminoverde\n\nGracias por comunicarse al Despacho Jur\u00eddico Camino Verde.\nLe recordamos que la consulta no tiene costo. Usted ha dado el primer paso a su tranquilidad. El Lic. Sergio Hern\u00e1ndez se comunicar\u00e1 en el horario deseado. Que pase buen d\u00eda. \ud83c\udf3f\n\n_Despacho Jur\u00eddico Camino Verde - Hern\u00e1ndez y Asociados_`;
}

// Mensaje de notificacion al Lic. Sergio
function mensajeParaLic(s) {
  return `\ud83d\udccb *Nuevo prospecto registrado*\n\n\ud83d\udc64 Nombre: ${s.nombre}\n\ud83d\udcde Tel\u00e9fono: ${s.telefono}\n\ud83d\udccd Colonia: ${s.colonia}\n\u2696\ufe0f Caso: ${s.caso}\n\ud83d\udcdd Descripci\u00f3n: ${s.descripcion}\n\ud83d\udd50 Horario preferido: ${s.ventana}\n\n_Despacho Jur\u00eddico Camino Verde_`;
}

// Mensaje para usuarios que siguen escribiendo
const MENSAJE_REPETIR = `Visite nuestras redes como *@Legal.CaminoVerde* o www.LegalCaminoVerde.com`;

// Sesiones en memoria
const sesiones = {};

// Detectar caso por palabras clave
function detectarCaso(texto) {
  const t = texto.toLowerCase();
  if (/terreno|predio|escritura|regulariz/.test(t))         return "1";
  if (/herencia|testamento|heredar|falleci/.test(t))        return "2";
  if (/divorcio|separa/.test(t))                            return "3";
  if (/concubinato|uni.n libre|pareja/.test(t))             return "4";
  if (/despido|trabajo|laboral|empresa|liquidaci/.test(t))  return "5";
  if (/contrato|renta|arrendamiento|inquilino/.test(t))     return "6";
  if (/manutenci|pensi.n|alimentaria|hijo/.test(t))         return "7";
  if (/penal|robo|delito|denuncia|detenido/.test(t))        return "8";
  return null;
}

// Google Sheets: guardar prospecto
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
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Prospectos!A:N",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          fecha, datos.nombre, datos.telefono, datos.colonia,
          datos.caso, datos.descripcion, datos.ventana,
          "Nuevo", "", "", "", "", "", "Pendiente",
        ]],
      },
    });
    console.log("Prospecto guardado: " + datos.nombre);
  } catch (err) {
    console.error("Error guardando en Sheets: " + err.message);
  }
}

// Enviar mensaje de WhatsApp
async function enviar(para, texto) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log("[TEST] -> " + para + ": " + texto.substring(0,60));
    return;
  }
  try {
    await axios.post(
      "https://graph.facebook.com/v19.0/" + PHONE_NUMBER_ID + "/messages",
      {
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: texto },
      },
      {
        headers: {
          Authorization: "Bearer " + WHATSAPP_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Enviado a " + para);
  } catch (err) {
    console.error("Error al enviar: " + JSON.stringify(err.response && err.response.data));
  }
}

// Logica principal del bot
async function procesarMensaje(telefono, texto) {
  const msg = texto.trim();

  if (!sesiones[telefono]) sesiones[telefono] = { paso: "bienvenida" };
  const s = sesiones[telefono];

  // Conversacion terminada
  if (s.paso === "completado") {
    return enviar(telefono, MENSAJE_REPETIR);
  }

  // Bienvenida
  if (s.paso === "bienvenida") {
    s.paso = "esperar_caso";
    return enviar(telefono,
      "\u00a1Hola! \ud83d\udc4b Bienvenido al Despacho Jur\u00eddico Camino Verde.\n\nEstoy aqu\u00ed para ayudarte a agendar una llamada con el Lic. Sergio Hern\u00e1ndez. Solo necesito unos datos r\u00e1pidos.\n\n" + MENU_CASOS
    );
  }

  // Elegir caso
  if (s.paso === "esperar_caso") {
    if (CASOS[msg]) {
      s.caso = CASOS[msg];
      s.paso = "esperar_nombre";
      return enviar(telefono, "Perfecto \u2705 Tu caso es: *" + s.caso + "*.\n\n\u00bfMe puedes dar tu *nombre completo*, por favor?");
    }
    const detectado = detectarCaso(msg);
    if (detectado) {
      s.casoPropuesto = detectado;
      s.paso = "confirmar_caso";
      return enviar(telefono, "Entiendo tu situaci\u00f3n. \u00bfTu caso es sobre *" + CASOS[detectado] + "*?\n\nResponde *S\u00ed* para confirmar, o escribe el n\u00famero correcto:\n\n" + MENU_CASOS);
    }
    return enviar(telefono, "No entend\u00ed bien. Por favor escribe el *n\u00famero* que corresponde a tu caso:\n\n" + MENU_CASOS);
  }

  // Confirmar caso detectado
  if (s.paso === "confirmar_caso") {
    if (/^s[ii]$/i.test(msg)) {
      s.caso = CASOS[s.casoPropuesto];
      s.paso = "esperar_nombre";
      return enviar(telefono, "Perfecto \u2705 Tu caso es: *" + s.caso + "*.\n\n\u00bfMe puedes dar tu *nombre completo*, por favor?");
    }
    if (CASOS[msg]) {
      s.caso = CASOS[msg];
      s.paso = "esperar_nombre";
      return enviar(telefono, "Entendido \u2705 Tu caso es: *" + s.caso + "*.\n\n\u00bfMe puedes dar tu *nombre completo*, por favor?");
    }
    return enviar(telefono, "Por favor responde *S\u00ed* para confirmar, o escribe el n\u00famero de tu caso:\n\n" + MENU_CASOS);
  }

  // Nombre
  if (s.paso === "esperar_nombre") {
    if (msg.length < 3) return enviar(telefono, "Por favor escribe tu nombre completo para continuar.");
    s.nombre = msg;
    s.paso   = "esperar_colonia";
    return enviar(telefono, "Mucho gusto, *" + s.nombre + "* \ud83d\ude0a\n\n\u00bfEn qu\u00e9 *colonia o \u00e1rea* vives o tienes el problema?");
  }

  // Colonia
  if (s.paso === "esperar_colonia") {
    if (msg.length < 2) return enviar(telefono, "Por favor ind\u00edcame la colonia o \u00e1rea.");
    s.colonia = msg;
    s.paso    = "esperar_descripcion";
    return enviar(telefono, "Gracias \u2705\n\nCu\u00e9ntame brevemente tu situaci\u00f3n (en 2 o 3 oraciones). Esto es para que el abogado llegue preparado a la llamada.");
  }

  // Descripcion
  if (s.paso === "esperar_descripcion") {
    if (msg.length < 10) return enviar(telefono, "Por favor dame un poco m\u00e1s de detalle para que el abogado pueda ayudarte mejor.");
    s.descripcion = msg;
    s.paso        = "esperar_ventana";
    return enviar(telefono, "Anotado \ud83d\udcdd\n\n\u00bfEn qu\u00e9 horario prefieres que el abogado te llame?\n\n1\ufe0f\u20e3 8:00am - 12:00pm\n2\ufe0f\u20e3 12:00pm - 4:00pm\n3\ufe0f\u20e3 4:00pm - 8:00pm\n\nResponde con 1, 2 o 3.");
  }

  // Ventana horaria
  if (s.paso === "esperar_ventana") {
    if (!VENTANAS[msg]) return enviar(telefono, "Por favor responde con *1*, *2* o *3* para elegir tu horario.");
    s.ventana  = VENTANAS[msg];
    s.telefono = telefono;
    s.paso     = "completado";

    await guardarEnSheets(s);
    await enviar(telefono, mensajeConfirmacion(s));
    await enviar(LIC_NUMERO, mensajeParaLic(s));
  }
}

// Webhook: verificacion de Meta
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado por Meta");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Webhook: recibir mensajes
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const messages = req.body && req.body.entry && req.body.entry[0] &&
                     req.body.entry[0].changes && req.body.entry[0].changes[0] &&
                     req.body.entry[0].changes[0].value &&
                     req.body.entry[0].changes[0].value.messages;
    if (!messages || messages.length === 0) return;
    const msg      = messages[0];
    const telefono = msg.from;
    const texto    = msg.type === "text" ? msg.text.body : null;
    if (!texto) return;
    await procesarMensaje(telefono, texto);
  } catch (err) {
    console.error("Error procesando webhook: " + err.message);
  }
});

// Health check
app.get("/", (req, res) => res.send("Bot Camino Verde activo"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Bot corriendo en puerto " + port));
