#!/bin/bash
# Publica el servidor (Codigo.gs). El cargador de Google lo toma solo en ≤10 minutos.
# Uso: bash fuente/tools/publicar-servidor.sh 1.0.1
set -e
V="$1"; R=/home/claude/dodo-app
sed "s/__VERSION_SERVIDOR__/$V/" $R/fuente/google/Codigo.gs > $R/servidor/Codigo.gs
cp $R/fuente/google/cargador.gs $R/servidor/cargador.gs
python3 - "$V" <<'P'
import hashlib,json,sys
h=open("/home/claude/dodo-app/servidor/Codigo.gs","rb").read()
json.dump({"version":sys.argv[1],"sha256":hashlib.sha256(h).hexdigest()},open("/home/claude/dodo-app/servidor/version.json","w"),indent=1)
P
cd $R && git add -A && git commit -qm "Servidor $V" && git push -q origin HEAD:main && echo "Servidor $V publicado"
