#!/bin/bash
# Publica una versión nueva de la app (se actualiza sola en los dispositivos).
# Uso: bash fuente/tools/publicar.sh 1.0.1 "Notas" [base]
set -e
V="$1"; NOTAS="$2"; BASE="${3:-1.0.0}"; R=/home/claude/dodo-app
cd $R/fuente && APP_VERSION="$V" python3 tools/build.py
cp $R/fuente/www/index.html $R/index.html
python3 - "$V" "$NOTAS" "$BASE" <<'P'
import hashlib,json,sys
h=open("/home/claude/dodo-app/index.html","rb").read()
json.dump({"version":sys.argv[1],"sha256":hashlib.sha256(h).hexdigest(),"notas":sys.argv[2],"base":sys.argv[3],"descarga":"https://github.com/lugolisandro0-cloud/dodo-app/raw/main/descargas/DODO.apk"},open("/home/claude/dodo-app/version.json","w"),ensure_ascii=False,indent=1)
P
cd $R && git add -A && git commit -qm "App $V: $NOTAS" && git push -q origin HEAD:main && echo "Publicada $V"
