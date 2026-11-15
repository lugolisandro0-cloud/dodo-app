// Arma DODO para Mac (Apple M e Intel) y Windows con Electron.
const { packager } = require("/tmp/tools/node_modules/@electron/packager");
const V = process.env.APP_VERSION || "1.0.0";
(async () => {
  const comunes = { dir: "/tmp/eb/app", out: "/tmp/eb/out", overwrite: true, electronVersion: "33.4.11", name: "DODO", executableName: "DODO", appVersion: V, asar: true, prune: false };
  for (const [platform, arch] of [["darwin", "arm64"], ["darwin", "x64"], ["win32", "x64"]]) {
    const extra = platform === "darwin" ? { icon: "/home/claude/dodo-app/fuente/recursos/icono.icns", appBundleId: "ar.dodo.central", appCategoryType: "public.app-category.business" } : {};
    const p = await packager({ ...comunes, ...extra, platform, arch });
    console.log("ok", platform, arch, p);
  }
})().catch(e => { console.error(e); process.exit(1); });
