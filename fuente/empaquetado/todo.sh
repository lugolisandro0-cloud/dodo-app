#!/bin/bash
# Arma las apps de escritorio. Uso: APP_VERSION=1.0.0 bash todo.sh
set -e
F=/home/claude/dodo-app/fuente
export APP_VERSION=${APP_VERSION:-1.0.0}
rm -rf /tmp/eb && mkdir -p /tmp/eb/app
cp $F/escritorio/{main.js,preload.js,icono.png,bandeja.png,bandeja-mac.png,bandeja-mac@2x.png} /tmp/eb/app/
python3 - <<P
import json;p=json.load(open("$F/escritorio/package.json"));p["version"]="$APP_VERSION";json.dump(p,open("/tmp/eb/app/package.json","w"),indent=1)
P
cp -r $F/www /tmp/eb/app/www
node $F/empaquetado/empaquetar.js
RC=$(find /tmp/tools -name rcodesign -type f | head -1)
for a in arm64 x64; do "$RC" sign "/tmp/eb/out/DODO-darwin-$a/DODO.app" >/dev/null 2>&1 || echo "aviso: firma mac $a"; done
node $F/empaquetado/icono-win.mjs
mkdir -p /home/claude/entregas && rm -f /home/claude/entregas/DODO*.zip
cd /tmp/eb/out
(cd "DODO-darwin-arm64" && zip -qry -X "/home/claude/entregas/DODO - Mac (chip Apple M).zip" "DODO.app")
(cd "DODO-darwin-x64" && zip -qry -X "/home/claude/entregas/DODO - Mac (Intel).zip" "DODO.app")
mv "DODO-win32-x64" "DODO" && zip -qry -X "/home/claude/entregas/DODO - Windows.zip" "DODO"; mv "DODO" "DODO-win32-x64"
ls -la /home/claude/entregas
echo LISTO
