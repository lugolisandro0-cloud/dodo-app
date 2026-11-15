const assert = require("assert");
const { crearEntorno } = require("./simulador");
const mails = [], triggers = [];
let radar = [];
const env = crearEntorno({ mails, triggers, ajustes: { MAILS: "a@x.com, b@x.com" }, fuente: u => u.includes("radar.json") ? JSON.stringify(radar) : null, ahora: new Date("2026-11-15T15:00:00Z") });
const P = env.post;
let r = P({ accion: "estado" }); assert(r.ok && !r.hayCuentas);
r = P({ accion: "crearCuenta", nombre: "Licha", contrasena: "123" }); assert(!r.ok);
const a = P({ accion: "crearCuenta", nombre: "Licha", contrasena: "secreta1" }); assert(a.ok && a.token && a.primera);
r = P({ accion: "crearCuenta", nombre: "Otro", contrasena: "secreta1" }); assert(!r.ok);
const inv = P({ accion: "invitar", token: a.token }); assert(inv.ok && inv.codigo);
r = P({ accion: "unirse", codigo: "XXXX-XXXX", nombre: "Flor", contrasena: "secreta2" }); assert(!r.ok);
r = P({ accion: "unirse", codigo: inv.codigo, nombre: "licha", contrasena: "secreta2" }); assert(!r.ok, "nombre repetido");
const f = P({ accion: "unirse", codigo: inv.codigo.toLowerCase(), nombre: "Flor", contrasena: "secreta2" }); assert(f.ok, JSON.stringify(f));
r = P({ accion: "unirse", codigo: inv.codigo, nombre: "Pepe", contrasena: "secreta3" }); assert(!r.ok, "código de un solo uso");
r = P({ accion: "login", nombre: "flor", contrasena: "mal" }); assert(!r.ok);
const f2 = P({ accion: "login", nombre: " FLOR ", contrasena: "secreta2" }); assert(f2.ok && f2.id === f.id);
// sync
r = P({ accion: "sync", token: a.token, since: "", cambios: [{ col: "contactos", id: "c1", data: { name: "Hotel X", cat: "hotel", status: "cont", last: "2026-10-01" } }, { col: "movimientos", id: "m1", data: { tipo: "ingreso", fecha: "2026-11-10", concepto: "Boda", monto: 1500, moneda: "USD", estado: "hecho", factura: "no" } }, { col: "nada", id: "z", data: {} }] });
assert(r.ok && r.filas.length === 2 && r.socios.length === 2, JSON.stringify(r));
const t1 = r.filas[1].updated_at;
r = P({ accion: "sync", token: f2.token, since: t1, cambios: [] }); assert(r.filas.length === 0);
r = P({ accion: "sync", token: f2.token, since: "", cambios: [{ col: "contactos", id: "c1", deleted: true }] }); assert(r.filas.find(x => x.id === "c1").deleted);
assert(env.sheets["Plata"].data.length === 2 && env.sheets["Contactos"].data.length === 1);
r = P({ accion: "sync", token: "malo" }); assert(!r.ok && r.sesion === false);
// vincular
const v = P({ accion: "vincularCrear", token: f2.token }); assert(v.ok);
const v2 = P({ accion: "vincularUsar", codigo: v.codigo }); assert(v2.ok && v2.id === f.id);
assert(!P({ accion: "vincularUsar", codigo: v.codigo }).ok);
// contraseña
assert(!P({ accion: "contrasena", token: a.token, actual: "x", nueva: "nuevaclave" }).ok);
assert(P({ accion: "contrasena", token: a.token, actual: "secreta1", nueva: "nuevaclave" }).ok);
assert(P({ accion: "login", nombre: "Licha", contrasena: "nuevaclave" }).ok);
// quitar socio
assert(!P({ accion: "quitarSocio", token: a.token, id: a.id }).ok);
// radar: primera lectura no avisa
radar = [{ id: "r1", title: "Party bands", score: 9, deadline: "2026-12-20" }, { id: "r2", title: "Cierra ya", score: 5, deadline: "2026-11-17" }];
assert.equal(env.ctx.revisarRadar().slice(0, 7), "primera");
assert.equal(mails.length, 0);
radar.push({ id: "r3", title: "Nueva buena", score: 8, deadline: "" }, { id: "r4", title: "Floja", score: 3 });
assert.equal(env.ctx.revisarRadar(), "avisado");
assert.equal(mails.length, 1); assert(/Nueva buena/.test(mails[0].htmlBody) && /Cierra ya/.test(mails[0].htmlBody), mails[0].htmlBody);
assert(!/Floja/.test(mails[0].htmlBody));
assert.equal(env.ctx.revisarRadar(), "sin novedades");
// postulado no avisa
P({ accion: "sync", token: a.token, cambios: [{ col: "radar", id: "r5", data: { status: "postulado" } }] });
radar.push({ id: "r5", title: "Ya fuimos", score: 9 });
assert.equal(env.ctx.revisarRadar(), "sin novedades");
// resumen
P({ accion: "sync", token: a.token, cambios: [{ col: "contactos", id: "c2", data: { name: "Planner Y", cat: "planner", status: "cont", last: "2026-10-01" } }, { col: "movimientos", id: "m2", data: { tipo: "ingreso", fecha: "2026-11-12", monto: 300000, moneda: "ARS", estado: "pendiente" } }] });
env.ctx.resumenSemanal();
const res = mails[mails.length - 1].htmlBody;
assert(/Planner Y/.test(res) && /Por cobrar: ARS 300/.test(res) && /Cobros sin factura: 1/.test(res), res);
// kit
assert(/no está publicado/.test(env.ctx.doGet({ parameter: { kit: "1" } }).html));
P({ accion: "sync", token: a.token, cambios: [{ col: "config", id: "kit", data: { publico: true, nombre: "DODO", bioEs: "Banda <b>funk</b>", repertorio: "Uptown Funk\nSeptember", videos: "https://youtu.be/x" } }] });
const k = env.ctx.doGet({ parameter: { kit: "1" } }).html;
assert(/Repertorio \(2 temas\)/.test(k) && /&lt;b&gt;funk/.test(k) && /youtu\.be\/x/.test(k));
assert(/funcionando/.test(env.ctx.doGet({}).texto || JSON.stringify(env.ctx.doGet({}))));
// instalar avisos
env.ctx.instalarAvisos(); assert.deepEqual(triggers, ["radarCadaHora", "resumenLunes"]);
assert(P({ accion: "probarMail", token: a.token }).ok);
console.log("Servidor: todas las pruebas pasaron");
