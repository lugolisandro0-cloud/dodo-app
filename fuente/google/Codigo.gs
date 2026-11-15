/**
 * DODO · Central — servidor en Google (Apps Script)
 *
 * Guarda contactos, oportunidades, movimientos de plata y el kit de la banda
 * en esta planilla. Manda avisos por mail cuando el radar encuentra algo y un
 * resumen los lunes. Sirve la página pública del kit (?kit=1).
 *
 * Este archivo lo descarga solo el cargador (cargador.gs). No hace falta pegarlo.
 */
const VERSION_SERVIDOR = "__VERSION_SERVIDOR__";
const TZ = "America/Argentina/Buenos_Aires";
const REPO = "https://raw.githubusercontent.com/lugolisandro0-cloud/dodo-app/main/";
const RADAR_URL = REPO + "radar/radar.json";
const COLECCIONES = ["contactos", "radar", "movimientos", "config"];
const MAX_SOCIOS = 8;
const APP_URL = "https://claude.ai/artifact/2GJntkG8AtAqZ2d9SiiYUE";

function ajuste_(k, def) { try { return (typeof AJUSTES !== "undefined" && AJUSTES && AJUSTES[k] !== undefined && AJUSTES[k] !== "") ? AJUSTES[k] : def; } catch (e) { return def; } }
function mails_() {
  const m = ajuste_("MAILS", "");
  const lista = Array.isArray(m) ? m : String(m || "").split(/[,;\s]+/);
  return lista.map(function (x) { return String(x).trim(); }).filter(function (x) { return /@/.test(x); });
}

// ===== Entrada =====
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.kit) return paginaKit_();
  return salida({ ok: true, app: "dodo-central", version: VERSION_SERVIDOR, mensaje: "El servidor de DODO está funcionando." });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return salida({ ok: false, error: "Pedido inválido." }); }
  if (!req) return salida({ ok: false, error: "Pedido inválido." });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(28000)) return salida({ ok: false, error: "El servidor está ocupado. Probá de nuevo en unos segundos." });
  try {
    if (req.accion === "estado") return salida(estadoCuentas());
    if (req.accion === "crearCuenta") return salida(crearPrimera(req));
    if (req.accion === "unirse") return salida(unirse(req));
    if (req.accion === "login") return salida(login(req));
    if (req.accion === "vincularUsar") return salida(vincularUsar(req));
    const ses = sesion(req.token);
    if (!ses) return salida({ ok: false, sesion: false, error: "Tu sesión se cerró. Volvé a entrar con tu contraseña." });
    if (req.accion === "sync") return salida(sincronizar(req, ses));
    if (req.accion === "salir") { cerrarSesion(req.token); return salida({ ok: true }); }
    if (req.accion === "contrasena") return salida(cambiarContrasena(req, ses));
    if (req.accion === "vincularCrear") return salida(vincularCrear(ses));
    if (req.accion === "invitar") return salida(invitar());
    if (req.accion === "quitarSocio") return salida(quitarSocio(req, ses));
    if (req.accion === "probarMail") return salida(probarMail());
    return salida({ ok: false, error: "Acción desconocida." });
  } catch (err) {
    return salida({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ===== Cuentas (socios) =====
// Todos los socios tienen los mismos permisos. Cada uno tiene su contraseña; se guarda solo una huella.
function props() { return PropertiesService.getScriptProperties(); }
function leerJSON(k, def) { try { const v = props().getProperty(k); return v ? JSON.parse(v) : def; } catch (err) { return def; } }
function usuarios() { return leerJSON("socios", {}); }
function guardarUsuarios(u) { props().setProperty("socios", JSON.stringify(u)); }
function huella(texto) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)); }
function nuevaSal() { return Utilities.getUuid() + Utilities.getUuid(); }
function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
function listaSocios() { const u = usuarios(); return Object.keys(u).map(function (id) { return { id: id, nombre: u[id].nombre }; }); }

// Si alguien se olvida la contraseña y nadie puede entrar: ejecutá reiniciarCuentas en Apps Script.
// Borra todas las cuentas (los datos NO se tocan). Al abrir la app, la primera persona crea su cuenta de nuevo.
function reiniciarCuentas() {
  guardarUsuarios({});
  const p = props(), todo = p.getProperties();
  Object.keys(todo).forEach(function (k) { if (k.indexOf("s_") === 0) p.deleteProperty(k); });
}

function estadoCuentas() {
  return { ok: true, hayCuentas: Object.keys(usuarios()).length > 0, socios: listaSocios() };
}
function validarNueva(req) {
  const nombre = String(req.nombre || "").trim(), pass = String(req.contrasena || "");
  if (!nombre) return "Escribí tu nombre.";
  if (pass.length < 6) return "La contraseña tiene que tener al menos 6 caracteres.";
  const u = usuarios();
  if (Object.keys(u).some(function (id) { return norm(u[id].nombre) === norm(nombre); })) return "Ya hay alguien con ese nombre. Usá otro (por ejemplo con el apellido).";
  return "";
}
function crearUsuario(req) {
  const u = usuarios(), sal = nuevaSal(), id = "u" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
  u[id] = { nombre: String(req.nombre).trim().slice(0, 40), sal: sal, hash: huella(sal + String(req.contrasena)), alta: Date.now() };
  guardarUsuarios(u);
  return abrirSesion(id);
}
function crearPrimera(req) {
  if (Object.keys(usuarios()).length) return { ok: false, error: "Ya hay cuentas creadas. Entrá con tu contraseña o pedí una invitación." };
  const err = validarNueva(req); if (err) return { ok: false, error: err };
  const r = crearUsuario(req); r.primera = true; return r;
}
function codigo8() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let cod = "";
  for (let i = 0; i < 8; i++) cod += letras.charAt(Math.floor(Math.random() * letras.length));
  return cod;
}
function invitar() {
  if (Object.keys(usuarios()).length >= MAX_SOCIOS) return { ok: false, error: "Ya hay " + MAX_SOCIOS + " cuentas." };
  const cod = codigo8();
  props().setProperty("invitacion", JSON.stringify({ hash: huella(cod), vence: Date.now() + 7 * 864e5 }));
  return { ok: true, codigo: cod.slice(0, 4) + "-" + cod.slice(4) };
}
function unirse(req) {
  const inv = leerJSON("invitacion", null);
  const cod = String(req.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (bloqueado("invitacion")) return { ok: false, error: "Demasiados intentos. Esperá 15 minutos." };
  if (!inv || inv.vence < Date.now() || huella(cod) !== inv.hash) {
    fallo("invitacion");
    return { ok: false, error: "El código de invitación no es válido o venció. Pedí uno nuevo." };
  }
  const err = validarNueva(req); if (err) return { ok: false, error: err };
  props().deleteProperty("invitacion");
  return crearUsuario(req);
}
function quitarSocio(req, ses) {
  const u = usuarios();
  if (!u[req.id]) return { ok: false, error: "Esa cuenta no existe." };
  if (req.id === ses.id) return { ok: false, error: "No podés quitarte a vos mismo." };
  delete u[req.id]; guardarUsuarios(u); borrarSesiones(req.id);
  return { ok: true, socios: listaSocios() };
}
function fallo(clave) {
  const f = leerJSON("fallas", {}); const x = f[clave] || { n: 0, hasta: 0 };
  if (x.hasta > Date.now()) return false;
  x.n++; if (x.n >= 8) { x.n = 0; x.hasta = Date.now() + 15 * 60000; }
  f[clave] = x; props().setProperty("fallas", JSON.stringify(f));
  return true;
}
function bloqueado(clave) { const x = leerJSON("fallas", {})[clave]; return !!(x && x.hasta > Date.now()); }
function login(req) {
  const u = usuarios(), n = norm(req.nombre);
  const id = Object.keys(u).filter(function (k) { return norm(u[k].nombre) === n; })[0];
  const clave = "login_" + (id || n);
  if (bloqueado(clave)) return { ok: false, error: "Demasiados intentos. Esperá 15 minutos." };
  if (!id) { fallo(clave); return { ok: false, error: "No hay ninguna cuenta con ese nombre." }; }
  if (huella(u[id].sal + String(req.contrasena || "")) !== u[id].hash) { fallo(clave); return { ok: false, error: "La contraseña no es correcta." }; }
  const f = leerJSON("fallas", {}); delete f[clave]; props().setProperty("fallas", JSON.stringify(f));
  return abrirSesion(id);
}
function abrirSesion(id) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  props().setProperty("s_" + huella(token), JSON.stringify({ id: id, vence: Date.now() + 365 * 864e5 }));
  const u = usuarios()[id];
  return { ok: true, token: token, id: id, nombre: u ? u.nombre : "" };
}
function sesion(token) {
  if (!token) return null;
  const s = leerJSON("s_" + huella(String(token)), null);
  if (!s || s.vence < Date.now() || !usuarios()[s.id]) return null;
  return s;
}
function cerrarSesion(token) { props().deleteProperty("s_" + huella(String(token))); }
function borrarSesiones(id) {
  const p = props(), todo = p.getProperties();
  Object.keys(todo).forEach(function (k) { if (k.indexOf("s_") === 0) { try { if (JSON.parse(todo[k]).id === id) p.deleteProperty(k); } catch (err) { } } });
}
function vincularCrear(ses) {
  const cod = codigo8(), p = props(), ahora = Date.now();
  Object.keys(p.getProperties()).forEach(function (k) { if (k.indexOf("v_") === 0) { const v = leerJSON(k, null); if (!v || v.vence < ahora) p.deleteProperty(k); } });
  p.setProperty("v_" + huella(cod), JSON.stringify({ id: ses.id, vence: ahora + 10 * 60000 }));
  return { ok: true, codigo: cod.slice(0, 4) + "-" + cod.slice(4), vence: ahora + 10 * 60000 };
}
function vincularUsar(req) {
  if (bloqueado("vincular")) return { ok: false, error: "Demasiados intentos. Esperá 15 minutos." };
  const cod = String(req.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const k = "v_" + huella(cod), v = leerJSON(k, null);
  if (!v || v.vence < Date.now() || !usuarios()[v.id]) { fallo("vincular"); return { ok: false, error: "El código no es válido o venció. Generá uno nuevo en el otro dispositivo." }; }
  props().deleteProperty(k);
  return abrirSesion(v.id);
}
function cambiarContrasena(req, ses) {
  const u = usuarios(), yo = u[ses.id];
  if (huella(yo.sal + String(req.actual || "")) !== yo.hash) return { ok: false, error: "La contraseña actual no es correcta." };
  if (String(req.nueva || "").length < 6) return { ok: false, error: "La contraseña nueva tiene que tener al menos 6 caracteres." };
  yo.sal = nuevaSal(); yo.hash = huella(yo.sal + String(req.nueva)); guardarUsuarios(u);
  return { ok: true };
}

// ===== Planilla de datos =====
let ultimoTs = "";
function ts() { let t = new Date().toISOString(); if (t <= ultimoTs) t = new Date(new Date(ultimoTs).getTime() + 1).toISOString(); ultimoTs = t; return t; }
function hoja(nombre, encabezado) {
  const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, sh.getMaxRows(), encabezado.length).setNumberFormat("@");
    sh.getRange(1, 1, 1, encabezado.length).setValues([encabezado]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}
function abrirStore() {
  const sh = hoja("_datos", ["col", "id", "data", "deleted", "updated_at"]);
  const n = sh.getLastRow(); const vals = n > 1 ? sh.getRange(2, 1, n - 1, 5).getValues() : [];
  const filas = [], idx = {};
  vals.forEach(function (v, i) {
    if (!v[0]) return;
    let data = {}; try { data = v[2] ? JSON.parse(v[2]) : {}; } catch (err) { data = {}; }
    const f = { col: String(v[0]), id: String(v[1]), data: data, deleted: String(v[3]) === "1", updated_at: String(v[4]), row: i + 2, sucia: false };
    filas.push(f); idx[f.col + "|" + f.id] = f;
  });
  return { sh: sh, filas: filas, idx: idx, huboCambios: false };
}
function guardar(st, col, id, data, borrado) {
  const k = col + "|" + id; let f = st.idx[k];
  if (!f) { f = { col: col, id: id, row: null }; st.filas.push(f); st.idx[k] = f; }
  f.data = borrado ? {} : data; f.deleted = !!borrado; f.updated_at = ts(); f.sucia = true; st.huboCambios = true;
  return f;
}
function escribir(st) {
  const fila = function (f) { return [f.col, f.id, JSON.stringify(f.data || {}), f.deleted ? "1" : "", f.updated_at]; };
  const nuevas = [];
  st.filas.forEach(function (f) { if (!f.sucia) return; if (f.row) st.sh.getRange(f.row, 1, 1, 5).setValues([fila(f)]); else nuevas.push(f); f.sucia = false; });
  if (nuevas.length) {
    const desde = st.sh.getLastRow() + 1, rango = st.sh.getRange(desde, 1, nuevas.length, 5);
    rango.setNumberFormat("@"); rango.setValues(nuevas.map(fila));
    nuevas.forEach(function (f, i) { f.row = desde + i; });
  }
}
function vivos(st, col) { return st.filas.filter(function (f) { return f.col === col && !f.deleted; }).map(function (f) { return Object.assign({ id: f.id }, f.data || {}); }); }
function sincronizar(req, ses) {
  const st = abrirStore();
  (req.cambios || []).forEach(function (c) {
    if (COLECCIONES.indexOf(c.col) < 0 || !c.id) return;
    const d = Object.assign({}, c.data || {});
    if (!c.deleted) { d.por = d.por || ses.id; d.editado = ses.id; }
    guardar(st, c.col, String(c.id).slice(0, 80), d, !!c.deleted);
  });
  escribir(st);
  if (st.huboCambios) { try { hojasLegibles(st); } catch (err) { } }
  const since = req.since || "", filas = [];
  st.filas.forEach(function (f) { if (f.updated_at > since) filas.push({ col: f.col, id: f.id, data: f.data, deleted: f.deleted, updated_at: f.updated_at }); });
  return { ok: true, filas: filas, yo: ses.id, socios: listaSocios(), mails: mails_().length, servidor: VERSION_SERVIDOR };
}

// ===== Hojas para leer (se arman solas) =====
const TXT_ESTADO = { pend: "Por contactar", cont: "Contactado", conv: "En conversación", prop: "Propuesta enviada", won: "Trabajando juntos", lost: "Descartado" };
function hojasLegibles(st) {
  const u = usuarios(), nom = function (id) { return (u[id] && u[id].nombre) || ""; };
  escribirHoja("Contactos", ["Nombre", "Rubro", "País", "Ciudad", "Persona", "Estado", "Último contacto", "Intentos", "Web", "Instagram", "Email", "Teléfono", "Notas"],
    vivos(st, "contactos").sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }).map(function (c) {
      return [c.name || "", c.cat || "", c.country || "", c.city || "", c.person || "", TXT_ESTADO[c.status] || c.status || "", c.last || "", c.attempts || 0, c.web || "", c.ig || "", c.email || "", c.phone || "", c.notes || ""];
    }));
  escribirHoja("Plata", ["Fecha", "Tipo", "Concepto", "Monto", "Moneda", "Estado", "Quién pagó / cobró", "Contraparte", "Categoría", "Medio", "Factura", "N.º factura", "Cargó"],
    vivos(st, "movimientos").sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); }).map(function (m) {
      return [m.fecha || "", m.tipo === "ingreso" ? "Cobro" : "Pago", m.concepto || "", Number(m.monto) || 0, m.moneda || "ARS", m.estado === "pendiente" ? "Pendiente" : "Hecho", m.quien || "", m.contraparte || "", m.categoria || "", m.medio || "", m.factura === "si" ? "Sí" : m.factura === "na" ? "No corresponde" : "No", m.nroFactura || "", nom(m.por)];
    }));
}
function escribirHoja(nombre, encabezado, filas) {
  const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.setFrozenRows(1); }
  sh.clearContents();
  sh.getRange(1, 1, 1, encabezado.length).setValues([encabezado]).setFontWeight("bold");
  sh.getRange(1, 1).setNote("Esta hoja se arma sola desde la app de DODO. Los cambios que hagas acá se pierden: cargalos desde la app.");
  if (filas.length) sh.getRange(2, 1, filas.length, encabezado.length).setValues(filas);
}

// ===== Radar: avisos por mail =====
function fmt(d, patron) { return Utilities.formatDate(d, TZ, patron); }
function hoyTxt() { return fmt(new Date(), "yyyy-MM-dd"); }
function diasHasta(fecha) { if (!fecha) return null; const a = new Date(hoyTxt() + "T12:00:00Z"), b = new Date(String(fecha).slice(0, 10) + "T12:00:00Z"); return Math.round((b - a) / 864e5); }
function leerRadar_() {
  const r = UrlFetchApp.fetch(RADAR_URL + "?t=" + Date.now(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return [];
  try { const j = JSON.parse(r.getContentText()); return Array.isArray(j) ? j : (j.items || []); } catch (e) { return []; }
}
function escH(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function itemHTML_(o) {
  const d = diasHasta(o.deadline);
  const cierre = d === null ? "Abierta, sin fecha de cierre" : d === 0 ? "<b style='color:#d6301f'>Cierra HOY</b>" : d < 0 ? "Cerrada" : "Cierra en " + d + " día" + (d === 1 ? "" : "s") + " (" + escH(o.deadline) + ")";
  return "<div style='border:3px solid #141210;border-radius:14px;padding:12px;margin:10px 0;background:#fffdf5'>" +
    "<div style='font-size:17px;font-weight:700'>" + escH(o.title) + "</div>" +
    (o.org ? "<div style='color:#6a604c'>" + escH(o.org) + "</div>" : "") +
    "<div style='margin:6px 0'>" + cierre + "</div>" +
    (o.action ? "<div><b>Qué hacer:</b> " + escH(o.action) + "</div>" : "") +
    (o.url ? "<div style='margin-top:6px'><a href='" + escH(o.url) + "'>Ver convocatoria</a></div>" : "") + "</div>";
}
function mailDodo_(asunto, cuerpo) {
  const a = mails_(); if (!a.length) return false;
  MailApp.sendEmail({ to: a.join(","), subject: asunto, name: "Radar DODO",
    htmlBody: "<div style='font-family:Arial,sans-serif;background:#fff3c9;padding:16px;color:#141210'><div style='font-size:30px;font-weight:900;letter-spacing:1px'>DODO</div>" + cuerpo +
      "<p style='color:#6a604c;font-size:12px'>Abrí la app de DODO para marcar si ya postularon o descartarla.</p></div>" });
  return true;
}
// Se ejecuta solo cada hora (ver instalarAvisos).
function revisarRadar() {
  const items = leerRadar_(); if (!items.length) return "sin radar";
  const st = abrirStore(), estados = {};
  vivos(st, "radar").forEach(function (r) { estados[r.id] = r.status; });
  const avisados = leerJSON("radar_avisados", {}), hoy = hoyTxt(), nuevos = [], urgentes = [];
  const primeraVez = !props().getProperty("radar_avisados");
  items.forEach(function (o) {
    if (!o || !o.id) return;
    const s = estados[o.id] || o.status || "nuevo";
    if (s === "postulado" || s === "descartado") return;
    const d = diasHasta(o.deadline); if (d !== null && d < 0) return;
    if (!avisados[o.id]) { avisados[o.id] = hoy; if ((Number(o.score) || 0) >= 6) nuevos.push(o); }
    else if (d !== null && d <= 3 && avisados["u_" + o.id] !== hoy) { avisados["u_" + o.id] = hoy; urgentes.push(o); }
  });
  props().setProperty("radar_avisados", JSON.stringify(avisados));
  if (primeraVez) return "primera lectura: " + items.length + " oportunidades registradas sin avisar";
  if (!nuevos.length && !urgentes.length) return "sin novedades";
  let cuerpo = "";
  if (nuevos.length) cuerpo += "<h2 style='margin:12px 0 0'>" + (nuevos.length === 1 ? "Oportunidad nueva" : nuevos.length + " oportunidades nuevas") + "</h2>" + nuevos.map(itemHTML_).join("");
  if (urgentes.length) cuerpo += "<h2 style='margin:12px 0 0;color:#d6301f'>Cierran en 3 días o menos</h2>" + urgentes.map(itemHTML_).join("");
  const asunto = nuevos.length ? "🎺 DODO: " + (nuevos.length === 1 ? nuevos[0].title : nuevos.length + " oportunidades nuevas") : "⏰ DODO: " + urgentes[0].title + " cierra pronto";
  mailDodo_(asunto, cuerpo);
  return "avisado";
}

// ===== Resumen de los lunes =====
const CADENCIA = { planner: 14, productora: 14, hotel: 21, agencia: 30, naviera: 45, tematico: 30, artista: 30, otro: 21 };
function resumenSemanal() {
  const st = abrirStore(), hoy = hoyTxt();
  const contactos = vivos(st, "contactos");
  const vencidos = contactos.filter(function (c) {
    if (c.status === "won" || c.status === "lost" || c.status === "pend" || !c.last) return false;
    const d = new Date(String(c.last).slice(0, 10) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + (Number(c.cadence) || CADENCIA[c.cat] || 21));
    return fmt(d, "yyyy-MM-dd") <= fmt(new Date(Date.now() + 6 * 864e5), "yyyy-MM-dd");
  });
  const pendientes = contactos.filter(function (c) { return c.status === "pend"; });
  const estados = {}; vivos(st, "radar").forEach(function (r) { estados[r.id] = r.status; });
  const ops = leerRadar_().filter(function (o) { const s = estados[o.id] || "nuevo"; const d = diasHasta(o.deadline); return s !== "postulado" && s !== "descartado" && (d === null || d >= 0); })
    .sort(function (a, b) { const x = diasHasta(a.deadline), y = diasHasta(b.deadline); return (x === null ? 999 : x) - (y === null ? 999 : y); });
  const movs = vivos(st, "movimientos"), mes = hoy.slice(0, 7);
  const sum = function (arr) { const o = {}; arr.forEach(function (m) { const k = m.moneda || "ARS"; o[k] = (o[k] || 0) + (Number(m.monto) || 0); }); return Object.keys(o).map(function (k) { return k + " " + Math.round(o[k]).toLocaleString("es-AR"); }).join(" + ") || "0"; };
  const porCobrar = movs.filter(function (m) { return m.tipo === "ingreso" && m.estado === "pendiente"; });
  const porPagar = movs.filter(function (m) { return m.tipo === "gasto" && m.estado === "pendiente"; });
  const sinFactura = movs.filter(function (m) { return m.tipo === "ingreso" && m.estado !== "pendiente" && m.factura === "no"; });
  const delMes = movs.filter(function (m) { return String(m.fecha).slice(0, 7) === mes && m.estado !== "pendiente"; });
  let c = "<h2 style='margin:12px 0 4px'>Resumen de la semana</h2>";
  c += "<p><b>Insistir esta semana:</b> " + (vencidos.length ? vencidos.slice(0, 12).map(function (x) { return escH(x.name); }).join(", ") + (vencidos.length > 12 ? " y " + (vencidos.length - 12) + " más" : "") : "nadie") + "</p>";
  c += "<p><b>Sin contactar todavía:</b> " + pendientes.length + "</p>";
  c += "<h3 style='margin:12px 0 0'>Oportunidades abiertas</h3>" + (ops.length ? ops.slice(0, 5).map(itemHTML_).join("") : "<p>No hay oportunidades abiertas.</p>");
  c += "<h3 style='margin:12px 0 4px'>Plata</h3><p>Cobrado este mes: " + sum(delMes.filter(function (m) { return m.tipo === "ingreso"; })) + "<br>Gastado este mes: " + sum(delMes.filter(function (m) { return m.tipo === "gasto"; })) +
    "<br>Por cobrar: " + sum(porCobrar) + " (" + porCobrar.length + ")<br>Por pagar: " + sum(porPagar) + " (" + porPagar.length + ")" + (sinFactura.length ? "<br><b>Cobros sin factura: " + sinFactura.length + "</b>" : "") + "</p>";
  mailDodo_("📋 DODO: resumen de la semana", c);
  return "ok";
}
function probarMail() {
  if (!mails_().length) return { ok: false, error: "No hay mails cargados. En Apps Script, en AJUSTES, completá MAILS y guardá." };
  mailDodo_("✅ DODO: los avisos por mail funcionan", "<p>Desde ahora les llegan acá las oportunidades nuevas del radar, las que están por cerrar y el resumen de los lunes.</p>");
  return { ok: true, enviados: mails_().length };
}
// Ejecutar UNA vez (desde el cargador): crea los avisos automáticos.
function instalarAvisos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { const f = t.getHandlerFunction(); if (f === "radarCadaHora" || f === "resumenLunes") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("radarCadaHora").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("resumenLunes").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone(TZ).create();
  let r = "avisos instalados"; try { r += " · radar: " + revisarRadar(); } catch (e) { r += " · radar: " + e; }
  return r;
}

// ===== Página pública del kit (?kit=1) =====
function paginaKit_() {
  const st = abrirStore(), f = st.idx["config|kit"], k = f && !f.deleted ? f.data : {};
  if (!k || !k.publico) return HtmlService.createHtmlOutput("<p style='font-family:sans-serif'>El kit de DODO todavía no está publicado.</p>").setTitle("DODO");
  const lineas = function (t) { return String(t || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(String); };
  const link = function (u) { return /^https?:\/\//i.test(u) ? "<a href='" + escH(u) + "' target='_blank' rel='noopener'>" + escH(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)) + "</a>" : escH(u); };
  const sec = function (t, html) { return html ? "<section><h2>" + escH(t) + "</h2>" + html + "</section>" : ""; };
  const temas = lineas(k.repertorio);
  let h = "<!doctype html><html lang='es'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>" + escH(k.nombre || "DODO") + " · Kit de prensa</title>" +
    "<style>body{margin:0;background:#fff3c9;color:#141210;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5}header{background:#2a9d5c;border-bottom:4px solid #141210;padding:28px 18px}" +
    "h1{margin:0;font-family:'Arial Black',Arial,sans-serif;font-size:56px;color:#fbfaf4;-webkit-text-stroke:2px #141210;text-shadow:4px 4px 0 #141210}header p{margin:6px 0 0;color:#fff;font-weight:700}" +
    "main{max-width:820px;margin:0 auto;padding:18px;display:grid;gap:16px}section{background:#fffdf5;border:3px solid #141210;border-radius:16px;padding:16px;box-shadow:4px 4px 0 #141210}" +
    "h2{margin:0 0 8px;font-size:20px}a{color:#137a5a;font-weight:700;word-break:break-all}ol{columns:2;column-gap:28px;margin:0;padding-left:22px}@media(max-width:600px){ol{columns:1}h1{font-size:44px}}ul{margin:0;padding-left:20px}</style></head><body>" +
    "<header><h1>" + escH(k.nombre || "DODO") + "</h1><p>" + escH(k.frase || "Banda de pop/funk para eventos · Buenos Aires") + "</p></header><main>";
  h += sec("Quiénes somos", (k.bioEs ? "<p>" + escH(k.bioEs).replace(/\n/g, "<br>") + "</p>" : "") + (k.bioEn ? "<p lang='en'><i>" + escH(k.bioEn).replace(/\n/g, "<br>") + "</i></p>" : ""));
  h += sec("Videos", lineas(k.videos).length ? "<ul>" + lineas(k.videos).map(function (u) { return "<li>" + link(u) + "</li>"; }).join("") + "</ul>" : "");
  h += sec("Formación", k.formacion ? "<p>" + escH(k.formacion).replace(/\n/g, "<br>") + "</p>" : "");
  h += sec("Formatos", k.formatos ? "<p>" + escH(k.formatos).replace(/\n/g, "<br>") + "</p>" : "");
  h += sec("Repertorio (" + temas.length + " temas)", temas.length ? "<ol>" + temas.map(function (t) { return "<li>" + escH(t) + "</li>"; }).join("") + "</ol>" : "");
  h += sec("Fotos", lineas(k.fotos).length ? "<ul>" + lineas(k.fotos).map(function (u) { return "<li>" + link(u) + "</li>"; }).join("") + "</ul>" : "");
  h += sec("Rider técnico", k.rider ? "<p>" + escH(k.rider).replace(/\n/g, "<br>") + "</p>" : "");
  h += sec("Contacto", k.contacto ? "<p>" + lineas(k.contacto).map(link).join("<br>") + "</p>" : "");
  h += "</main></body></html>";
  return HtmlService.createHtmlOutput(h).setTitle((k.nombre || "DODO") + " · Kit de prensa").addMetaTag("viewport", "width=device-width, initial-scale=1");
}
