// Prueba de punta a punta: app real en Chrome + servidor simulado (Codigo.gs en el simulador).
const path=require("path"),fs=require("fs"),http=require("http");
const puppeteer=require("/tmp/tools/node_modules/puppeteer-core");
const {crearEntorno}=require("../google/simulador");
const F=path.join(__dirname,".."),R=path.join(F,"..");
const radar=fs.readFileSync(path.join(R,"radar/radar.json"),"utf8"),semilla=fs.readFileSync(path.join(R,"semilla/contactos.json"),"utf8");
const env=crearEntorno({mails:[],triggers:[],ajustes:{MAILS:"a@x.com"},fuente:u=>u.includes("radar.json")?radar:null,ahora:new Date()});
const URL_SRV="https://script.google.com/macros/s/PRUEBA/exec";
const tipos={".html":"text/html",".png":"image/png",".woff2":"font/woff2",".webmanifest":"application/json"};
const srv=http.createServer((q,r)=>{const f=path.join(F,"www",decodeURIComponent(q.url.split("?")[0])==="/"?"index.html":decodeURIComponent(q.url.split("?")[0]));fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"content-type":tipos[path.extname(f)]||"text/plain"});r.end(b)})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function nueva(browser,w,h,mobile){
  const ctx=await browser.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:w,height:h,isMobile:!!mobile,deviceScaleFactor:1});
  await p.setRequestInterception(true);
  p.on("request",q=>{const u=q.url();
    if(u.startsWith(URL_SRV)){if(q.method()==="POST"){const body=JSON.parse(q.postData());const out=env.post(body);q.respond({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(out)})}else q.respond({status:200,contentType:"application/json",body:"{}"});return}
    if(u.includes("raw.githubusercontent.com")){if(u.includes("radar.json"))return q.respond({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:radar});if(u.includes("contactos.json"))return q.respond({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:semilla});for(const f of ["propuestas/propuestas.json","proveedores/proveedores.json"])if(u.includes(f))return q.respond({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:fs.readFileSync(path.join(R,f),"utf8")});return q.respond({status:404,headers:{"access-control-allow-origin":"*"},body:""})}
    q.continue()});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
  p.errs=errs;return p;
}
(async()=>{
  await new Promise(r=>srv.listen(8765,r));
  const browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox"],headless:"new"});
  const out=path.join(F,"pruebas","capturas");fs.mkdirSync(out,{recursive:true});
  const A=await nueva(browser,390,844,true);
  await A.goto("http://localhost:8765/",{waitUntil:"networkidle0"});
  await A.waitForSelector("#acceso #a_url");
  await A.screenshot({path:out+"/01-acceso.png"});
  await A.type("#a_url",URL_SRV);await A.click("#acceso .btn.primary");
  await A.waitForSelector("#a_seed");await A.type("#a_n","Licha");await A.type("#a_p","secreta1");
  await A.click("#acceso .btn.primary");
  await A.waitForFunction(()=>!document.querySelector("#acceso"),{timeout:20000});
  await sleep(1500);
  const nC=await A.evaluate(()=>Object.keys(D.contactos).length);if(nC!==67)throw new Error("contactos "+nC);
  const nR=await A.evaluate(()=>RADAR.items.length);if(nR!==JSON.parse(radar).items.length)throw new Error("radar "+nR);
  await A.screenshot({path:out+"/02-radar.png"});
  // la alerta grande aparece al volver a la app (no en la primera instalación); probamos la lógica directo
  await A.evaluate(()=>{vistos={ids:{},urgente:""};revisarAlertas()});await sleep(500);
  await A.screenshot({path:out+"/03-alerta.png"});
  await A.click("#alertClose");
  // movimiento
  await A.click('nav.tabbar button[data-tab="plata"]');await A.click("#fab");await A.waitForSelector("#m_concepto");
  await A.type("#m_concepto","Boda Martínez · seña");await A.type("#m_monto","450000");
  await A.select("#m_quien","Licha");await A.select("#m_cat","Seña");
  await A.click('#sheetBody button[type="submit"]');await sleep(400);
  await A.click("#fab");await A.waitForSelector("#m_concepto");await A.click('#m_tipo button[data-v="gasto"]');
  await A.type("#m_concepto","Sala de ensayo");await A.type("#m_monto","60000");await A.select("#m_quien","Flor");await A.click('#m_estado button[data-v="pendiente"]');
  await A.click('#sheetBody button[type="submit"]');await sleep(400);
  await A.screenshot({path:out+"/04-plata.png",fullPage:true});
  // hoy
  await A.evaluate(()=>{const c=Object.keys(D.contactos)[0];const x=D.contactos[c];guardar("contactos",c,{...x,status:"cont",last:"2026-10-01",attempts:1})});
  await A.click('nav.tabbar button[data-tab="hoy"]');await sleep(300);await A.screenshot({path:out+"/05-hoy.png",fullPage:true});
  // contactos + ficha
  await A.click('nav.tabbar button[data-tab="contactos"]');await sleep(300);await A.screenshot({path:out+"/06-contactos.png"});
  await A.evaluate(()=>fichaContacto(contactos().find(c=>c.id==="cl-mandarin")));await sleep(300);await A.screenshot({path:out+"/07-ficha.png"});
  await A.evaluate(()=>sheet.close());
  // kit
  await A.click('nav.tabbar button[data-tab="mas"]');await sleep(200);await A.screenshot({path:out+"/08-mas.png"});
  await A.evaluate(()=>abrirKit());await sleep(200);
  await A.evaluate(()=>{$("#k_bioEs").value="Somos DODO, banda de pop/funk de Buenos Aires.";$("#k_bioEn").value="We are DODO, a pop/funk party band from Buenos Aires.";$("#k_videos").value="https://youtu.be/abc";$("#k_repertorio").value="Bruno Mars – Uptown Funk\nEarth, Wind & Fire – September";$("#k_pub").checked=true});
  await A.click('#sheetBody button[type="submit"]');await sleep(800);
  await A.screenshot({path:out+"/09-kit.png"});
  const kitHtml=env.ctx.doGet({parameter:{kit:"1"}}).html;if(!/Uptown Funk/.test(kitHtml))throw new Error("kit no publicado");
  // mail
  await A.evaluate(()=>dialogoMail({op:RADAR.items[0]}));await sleep(200);
  const asunto=await A.$eval("#mm_asunto",e=>e.value);if(!/Musicians for Cruises/.test(asunto))throw new Error("asunto "+asunto);
  await A.screenshot({path:out+"/10-mail.png"});
  await A.evaluate(()=>sheet.close());
  // paquetes y presupuesto
  await A.click('nav.tabbar button[data-tab="paquetes"]');await A.waitForFunction(()=>document.querySelectorAll("#pkgList .pkg").length===3,{timeout:8000});
  await A.screenshot({path:out+"/13-paquetes.png"});await A.screenshot({path:out+"/13b-paquetes-todo.png",fullPage:true});
  await A.evaluate(()=>abrirPresupuesto("show"));await sleep(200);
  await A.type("#q_cli","Sofi y Martín");await A.type("#q_ev","su boda");await A.click("#q_ex_grab");await A.click("#q_lanz");await sleep(200);
  const totTxt=await A.$eval(".quote-total b",e=>e.textContent);if(!/4\.080\.000/.test(totTxt))throw new Error("total presupuesto "+totTxt);
  await A.screenshot({path:out+"/14-presupuesto.png"});
  const nMov=await A.evaluate(()=>Object.keys(D.movimientos).length);
  await A.evaluate(()=>[...document.querySelectorAll("#sheetBody button")].find(b=>/Anotar en Plata/.test(b.textContent)).click());await sleep(300);
  if(await A.evaluate(()=>Object.keys(D.movimientos).length)!==nMov+1)throw new Error("no anotó el cobro");
  await A.evaluate(()=>abrirPrecios());await sleep(200);await A.evaluate(()=>{$("#pr_show").value="4500000"});
  await A.evaluate(()=>[...document.querySelectorAll("#sheetBody button")].find(b=>b.textContent==="Guardar").click());await sleep(300);
  if(await A.evaluate(()=>precioDe("show"))!==4500000)throw new Error("precio no guardado");
  // alquiler
  await A.evaluate(()=>{localStorage.setItem("dodo-prov-vistos",JSON.stringify({sondar:1}));badgeProv()});
  const bdg=await A.$eval("#bProv",e=>e.textContent);if(!(Number(bdg)>5))throw new Error("badge proveedores "+bdg);
  await A.click('nav.tabbar button[data-tab="alquiler"]');await sleep(300);
  await A.screenshot({path:out+"/15-alquiler.png"});
  if(await A.$eval("#bProv",e=>e.textContent))throw new Error("badge no se limpió");
  await A.click('#provFilt button[data-v="service"]');await sleep(200);
  const nServ=await A.$$eval("#provList .card",x=>x.length);if(nServ<4)throw new Error("filtro service "+nServ);
  await A.screenshot({path:out+"/16-alquiler-service.png",fullPage:true});
  await A.evaluate(()=>[...document.querySelectorAll("#provList .link-btn")][0].click());await sleep(300);
  if(!(await A.evaluate(()=>contactos().some(c=>c.cat==="proveedor"))))throw new Error("no guardó proveedor");
  // invitación
  const inv=env.post({accion:"invitar",token:await A.evaluate(()=>JSON.parse(localStorage.getItem("dodo-sesion")).token)});
  const B=await nueva(browser,1280,900,false);
  await B.goto("http://localhost:8765/",{waitUntil:"networkidle0"});await B.waitForSelector("#a_url");
  await B.type("#a_url",URL_SRV);await B.click("#acceso .btn.primary");await B.waitForSelector("#a_modo");
  await B.click('#a_modo button[data-v="inv"]');await B.waitForSelector("#a_c");
  await B.type("#a_c",inv.codigo);await B.type("#a_n","Flor");await B.type("#a_p","secreta2");await B.click("#acceso .btn.primary");
  await B.waitForFunction(()=>!document.querySelector("#acceso"),{timeout:20000});await sleep(1500);
  const nB=await B.evaluate(()=>[Object.keys(D.contactos).length,Object.keys(D.movimientos).length,!!(D.config.kit&&D.config.kit.publico)]);
  if(nB[0]!==68||nB[1]!==3||!nB[2])throw new Error("Flor no ve los datos "+nB);
  await B.click('nav.tabbar button[data-tab="plata"]');await sleep(300);await B.screenshot({path:out+"/11-compu-plata.png"});
  await B.click('nav.tabbar button[data-tab="paquetes"]');await sleep(400);await B.screenshot({path:out+"/17-compu-paquetes.png",fullPage:true});
  if(await B.evaluate(()=>precioDe("show"))!==4500000)throw new Error("Flor no ve el precio cambiado");
  const pres=await B.evaluate(()=>[!!document.querySelector("#pkgPres iframe[src*='/preview']"),kitTexto("es").includes("drive.google.com")]);if(!pres[0]||!pres[1])throw new Error("Falta la presentación "+pres);
  await B.click('nav.tabbar button[data-tab="alquiler"]');await sleep(300);await B.screenshot({path:out+"/18-compu-alquiler.png"});
  await B.evaluate(()=>{document.documentElement.dataset.mode="dark"});await B.click('nav.tabbar button[data-tab="radar"]');await sleep(300);await B.screenshot({path:out+"/12-compu-noche.png"});
  // Flor marca postulada y Licha lo ve
  await B.evaluate(()=>setOp(RADAR.items[0],"postulado"));await sleep(1500);
  await A.evaluate(()=>sync.ciclo());await sleep(1500);
  const st=await A.evaluate(()=>estadoOp(RADAR.items[0]));if(st!=="postulado")throw new Error("no sincronizó estado "+st);
  // avisos planificados
  const plan=await A.evaluate(()=>planAvisos().map(a=>a.title));if(!plan.some(t=>/Resumen/.test(t)))throw new Error("sin resumen semanal");
  const errores=[...A.errs,...B.errs].filter(e=>!/favicon|404/.test(e));
  if(errores.length)throw new Error("errores en consola: "+errores.join(" | "));
  console.log("E2E OK · avisos planificados:",plan.length);
  await browser.close();srv.close();
})().catch(e=>{console.error("FALLÓ:",e.message);process.exit(1)});
