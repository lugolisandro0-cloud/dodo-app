import * as ResEdit from "/tmp/tools/node_modules/resedit/dist/index.js";
import * as PELibrary from "/tmp/tools/node_modules/pe-library/dist/index.js";
import fs from "fs";
const V = (process.env.APP_VERSION || "1.0.0").split(".").map(Number);
const exe = "/tmp/eb/out/DODO-win32-x64/DODO.exe";
const pe = PELibrary.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(pe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync("/home/claude/dodo-app/fuente/recursos/icono.ico"));
const grupos = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const id = grupos.length ? grupos[0].id : 1, lang = grupos.length ? grupos[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
if (vi) { vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: "DODO", FileDescription: "DODO", CompanyName: "DODO", OriginalFilename: "DODO.exe", InternalName: "DODO" }); vi.setFileVersion(V[0], V[1], V[2], 0, 1033); vi.setProductVersion(V[0], V[1], V[2], 0, 1033); vi.outputToResourceEntries(res.entries); }
res.outputResource(pe);
fs.writeFileSync(exe, Buffer.from(pe.generate()));
console.log("icono de Windows listo");
