const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("dodoDesktop", {
  mostrar: () => ipcRenderer.send("dodo:mostrar"),
  badge: n => ipcRenderer.send("dodo:badge", Number(n) || 0),
  abrir: u => ipcRenderer.send("dodo:abrir", String(u || "")),
  inicio: v => ipcRenderer.invoke("dodo:inicio", typeof v === "boolean" ? v : null)
});
