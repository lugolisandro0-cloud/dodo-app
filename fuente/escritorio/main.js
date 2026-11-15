const { app, BrowserWindow, shell, Menu, Tray, ipcMain, nativeImage } = require("electron");
const path = require("path"), fs = require("fs");

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId("ar.dodo.central"); // necesario para que Windows muestre las notificaciones

let win = null, tray = null, saliendo = false;
const prefsPath = () => path.join(app.getPath("userData"), "preferencias.json");
const prefs = () => { try { return JSON.parse(fs.readFileSync(prefsPath(), "utf8")); } catch (e) { return {}; } };
const guardarPrefs = p => { try { fs.writeFileSync(prefsPath(), JSON.stringify(p)); } catch (e) { } };
const oculto = process.argv.includes("--oculto") || (app.getLoginItemSettings && app.getLoginItemSettings().wasOpenedAsHidden);

function inicioAutomatico(v) {
  if (typeof v === "boolean") {
    app.setLoginItemSettings({ openAtLogin: v, openAsHidden: true, args: ["--oculto"] });
    const p = prefs(); p.inicioDefinido = true; guardarPrefs(p);
  }
  return app.getLoginItemSettings({ args: ["--oculto"] }).openAtLogin;
}

function crearVentana() {
  win = new BrowserWindow({
    width: 1200, height: 860, minWidth: 380, minHeight: 560, show: !oculto,
    title: "DODO", backgroundColor: "#fff3c9", icon: path.join(__dirname, "icono.png"), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false, backgroundThrottling: false, preload: path.join(__dirname, "preload.js") }
  });
  win.loadFile(path.join(__dirname, "www", "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); if (/^(https?|mailto):/.test(url)) shell.openExternal(url); } });
  // Cerrar la ventana no cierra la app: queda en la bandeja para seguir avisando.
  win.on("close", e => {
    if (saliendo) return;
    e.preventDefault(); win.hide();
    const p = prefs();
    if (!p.avisoBandeja && tray && process.platform === "win32") { tray.displayBalloon({ title: "DODO sigue funcionando", content: "Queda acá al lado del reloj para avisarte de oportunidades. Para cerrarla del todo: clic derecho > Salir." }); p.avisoBandeja = true; guardarPrefs(p); }
  });
}
function mostrar() { if (!win) crearVentana(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

app.on("second-instance", mostrar);
app.on("before-quit", () => { saliendo = true; });

app.whenReady().then(() => {
  const esMac = process.platform === "darwin";
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(esMac ? [{ label: "DODO", submenu: [{ role: "about", label: "Acerca de DODO" }, { type: "separator" }, { role: "hide", label: "Ocultar" }, { role: "quit", label: "Salir" }] }] : []),
    { label: "Edición", submenu: [{ role: "undo", label: "Deshacer" }, { role: "redo", label: "Rehacer" }, { type: "separator" }, { role: "cut", label: "Cortar" }, { role: "copy", label: "Copiar" }, { role: "paste", label: "Pegar" }, { role: "selectAll", label: "Seleccionar todo" }] },
    { label: "Ver", submenu: [{ role: "reload", label: "Recargar" }, { role: "resetZoom", label: "Tamaño normal" }, { role: "zoomIn", label: "Agrandar" }, { role: "zoomOut", label: "Achicar" }, { type: "separator" }, { role: "togglefullscreen", label: "Pantalla completa" }] },
    { label: "Ventana", submenu: [{ role: "minimize", label: "Minimizar" }, { role: "close", label: "Cerrar ventana" }] }
  ]));
  const icTray = nativeImage.createFromPath(path.join(__dirname, esMac ? "bandeja-mac.png" : "bandeja.png"));
  if (esMac) icTray.setTemplateImage(true);
  tray = new Tray(icTray);
  tray.setToolTip("DODO");
  tray.setContextMenu(Menu.buildFromTemplate([{ label: "Abrir DODO", click: mostrar }, { type: "separator" }, { label: "Salir", click: () => { saliendo = true; app.quit(); } }]));
  tray.on("click", mostrar);
  // La primera vez, la app queda configurada para abrirse sola al prender la compu (se puede apagar en Más > Avisos).
  if (!prefs().inicioDefinido) { try { inicioAutomatico(true); } catch (e) { } }
  crearVentana();
  app.on("activate", mostrar);
});

ipcMain.on("dodo:mostrar", mostrar);
ipcMain.on("dodo:badge", (e, n) => { try { if (process.platform === "darwin") app.setBadgeCount(n); tray && tray.setToolTip(n ? "DODO · " + n + " pendiente" + (n === 1 ? "" : "s") : "DODO"); } catch (err) { } });
ipcMain.on("dodo:abrir", (e, u) => { if (/^(https?|mailto):/.test(u)) shell.openExternal(u); });
ipcMain.handle("dodo:inicio", (e, v) => inicioAutomatico(v));
app.on("window-all-closed", () => { /* sigue en la bandeja */ });
