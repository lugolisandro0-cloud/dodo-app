# Cómo se arma cada parte

- **App (web):** `fuente/app.html` es la fuente. `APP_VERSION=x.y.z python3 fuente/tools/build.py` arma `fuente/www`.
- **Publicar una versión (se actualiza sola):** `bash fuente/tools/publicar.sh 1.0.1 "Notas"`.
- **Servidor:** `fuente/google/Codigo.gs`. Probar con `node fuente/google/prueba.js` y `node fuente/google/prueba-cargador.js`. Publicar con `bash fuente/tools/publicar-servidor.sh 1.0.1`.
- **Prueba completa (app + servidor simulado en Chrome):** `node fuente/pruebas/e2e.js` (necesita puppeteer-core y Chrome).
- **APK Android:** se arma desde la plantilla Capacitor (App + LocalNotifications) del APK de Alumnos y Cuotas, decodificada con apktool:
  `python3 fuente/android/armar_apk.py <plantilla> fuente/www /tmp/apk/dodo <versionCode> <versionName>`, después `apktool b` y firmar con uber-apk-signer y la llave `dodo.keystore` (no está en el repo: la guarda Licha). Si se firma con otra llave, hay que desinstalar la app y volver a instalarla (los datos están en Google, no se pierden).
- **Windows y Mac:** `APP_VERSION=x.y.z bash fuente/empaquetado/todo.sh` (Electron 33, firma ad-hoc en Mac con rcodesign).
