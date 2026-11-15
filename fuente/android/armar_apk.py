# Arma el APK de DODO a partir de la plantilla Capacitor (decodificada con apktool).
# Uso: python3 armar_apk.py <plantilla_decodificada> <www> <salida_dir> <versionCode> <versionName>
import sys, os, re, shutil, json
from PIL import Image, ImageDraw, ImageFont
tpl, www, out, vcode, vname = sys.argv[1:6]
R = os.path.dirname(os.path.abspath(__file__)); REC = os.path.join(R, "..", "recursos")
shutil.rmtree(out, ignore_errors=True); shutil.copytree(tpl, out)
VIEJO, NUEVO = "ar.fackmusic.alumnos", "ar.dodo.central"
# manifest: paquete, autoridades, permisos y esquema propios (la clase MainActivity queda con su nombre completo)
m = open(os.path.join(out, "AndroidManifest.xml"), encoding="utf-8").read()
m = m.replace('android:name="ar.fackmusic.alumnos.MainActivity"', 'android:name="@@MAIN@@"')
m = m.replace(VIEJO, NUEVO).replace('android:scheme="fackalumnos"', 'android:scheme="dodobanda"')
m = m.replace('android:name="@@MAIN@@"', 'android:name="ar.fackmusic.alumnos.MainActivity"')
m = m.replace(' android:debuggable="true"', '')
m = m.replace('<uses-permission android:name="android.permission.CAMERA"/>\n', '').replace('<uses-feature android:name="android.hardware.camera" android:required="false"/>\n', '')
open(os.path.join(out, "AndroidManifest.xml"), "w", encoding="utf-8").write(m)
# textos
p = os.path.join(out, "res/values/strings.xml"); s = open(p, encoding="utf-8").read()
s = s.replace(">Alumnos y Cuotas<", ">DODO<").replace(">" + VIEJO + "<", ">" + NUEVO + "<")
open(p, "w", encoding="utf-8").write(s)
p = os.path.join(out, "res/values/colors.xml"); s = open(p, encoding="utf-8").read()
s = re.sub(r'(<color name="ic_launcher_background">)#[0-9a-fA-F]+', r'\1#ffffc93c', s)
open(p, "w", encoding="utf-8").write(s)
# íconos
ico = Image.open(os.path.join(REC, "icono-1024.png")).convert("RGBA")
seg = Image.open(os.path.join(REC, "icono-seguro-1024.png")).convert("RGBA")
for d, n in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    base = os.path.join(out, "res", "mipmap-" + d)
    ico.resize((n, n), Image.LANCZOS).save(os.path.join(base, "ic_launcher.png"))
    mask = Image.new("L", (n, n), 0); ImageDraw.Draw(mask).ellipse((0, 0, n - 1, n - 1), fill=255)
    r = ico.resize((n, n), Image.LANCZOS); r.putalpha(mask); r.save(os.path.join(base, "ic_launcher_round.png"))
    fg = int(n * 108 / 48); seg.resize((fg, fg), Image.LANCZOS).save(os.path.join(base, "ic_launcher_foreground.png"))
# ícono chico de notificación (blanco sobre transparente)
fuente = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 80)
for d, n in {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}.items():
    im = Image.new("RGBA", (96, 96), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    dr.ellipse((4, 4, 92, 92), outline=(255, 255, 255, 255), width=8)
    w = dr.textlength("D", font=fuente); dr.text(((96 - w) / 2, 2), "D", font=fuente, fill=(255, 255, 255, 255))
    im.resize((n, n), Image.LANCZOS).save(os.path.join(out, "res", "drawable-" + d, "ic_stat_alumnos.png"))
# pantallas de inicio
for root, _, files in os.walk(os.path.join(out, "res")):
    for f in files:
        if f == "splash.png":
            fp = os.path.join(root, f); W, H = Image.open(fp).size
            sp = Image.new("RGB", (W, H), (255, 243, 201)); k = int(min(W, H) * 0.42)
            sp.paste(ico.resize((k, k), Image.LANCZOS).convert("RGB"), ((W - k) // 2, (H - k) // 2)); sp.save(fp)
# contenido web
pub = os.path.join(out, "assets", "public")
guardar = {f: open(os.path.join(pub, f), "rb").read() for f in ("cordova.js", "cordova_plugins.js")}
shutil.rmtree(pub); shutil.copytree(www, pub)
for f, b in guardar.items(): open(os.path.join(pub, f), "wb").write(b)
cfg = {"appId": NUEVO, "appName": "DODO", "webDir": "www", "backgroundColor": "#fff3c9",
       "android": {"allowMixedContent": False, "backgroundColor": "#fff3c9"},
       "plugins": {"SystemBars": {"style": "LIGHT", "insetsHandling": "css"}, "LocalNotifications": {"smallIcon": "ic_stat_alumnos", "iconColor": "#2a9d5c"}}}
json.dump(cfg, open(os.path.join(out, "assets", "capacitor.config.json"), "w"), indent="\t")
# versión
p = os.path.join(out, "apktool.yml"); s = open(p).read()
s = re.sub(r"versionCode: .*", "versionCode: " + vcode, s); s = re.sub(r"versionName: .*", "versionName: " + vname, s)
s = s.replace("apkFileName: AlumnosYCuotas.apk", "apkFileName: DODO.apk")
open(p, "w").write(s)
print("plantilla lista", out)
