# Arma la carpeta www (app lista para empaquetar o publicar).
# Uso: APP_VERSION=1.0.0 python3 tools/build.py
import os, shutil, json
F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.environ.get("APP_VERSION", "1.0.0")
UPD = os.environ.get("UPD_BASE", "https://raw.githubusercontent.com/lugolisandro0-cloud/dodo-app/main/")
W = os.path.join(F, "www")
shutil.rmtree(W, ignore_errors=True); os.makedirs(W)
s = open(os.path.join(F, "app.html"), encoding="utf-8").read()
assert s.count("__VERSION__") == 1 and s.count("__UPDBASE__") == 1
s = s.replace("__VERSION__", V).replace("__UPDBASE__", UPD)
open(os.path.join(W, "index.html"), "w", encoding="utf-8").write(s)
shutil.copytree(os.path.join(F, "recursos", "fonts"), os.path.join(W, "fonts"))
for n in (180, 192, 512): shutil.copy(os.path.join(F, "recursos", f"icono-{n}.png"), os.path.join(W, f"icono-{n}.png"))
json.dump({"name": "DODO · Central", "short_name": "DODO", "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#fff3c9", "theme_color": "#2a9d5c", "lang": "es",
           "icons": [{"src": "icono-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icono-512.png", "sizes": "512x512", "type": "image/png"}]},
          open(os.path.join(W, "manifest.webmanifest"), "w"), ensure_ascii=False)
print("www listo", V)
