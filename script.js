/* ==========================
   HULPFUNCTIES
========================== */

function qs(id){ return document.getElementById(id); }

function toggleInfo(id){
  const box = qs(id);
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function toggleFAQ(el){
  const ans = el.nextElementSibling;
  ans.style.display = ans.style.display === "block" ? "none" : "block";
}

/* ==========================
   ROL-UPDATES
========================== */

document.addEventListener("DOMContentLoaded", ()=>{
  updateRoleUI();
  showMutationInfo();
  showNotaireHint();
});

document.querySelectorAll("input[name='role']").forEach(r=>{
  r.addEventListener("change", updateRoleUI);
});

function updateRoleUI(){
  const isKoper = qs("role_koper").checked;
  const isVerkoper = qs("role_verkoper").checked;
  const isNotaris = qs("role_notaris").checked;

  const fields = ["prix_achat","prix_vente","dept","type_bien","rp","annees"];
  fields.forEach(f=> qs(f).disabled = false);

  if(isKoper){
    qs("prix_achat").disabled = true;
    qs("rp").disabled = true;
    qs("annees").disabled = true;
  }
  if(isVerkoper){
    qs("dept").disabled = true;
    qs("type_bien").disabled = true;
  }
}

/* ==========================
   MUTATION TARIEF
========================== */

function mutationRate(dept){
  const d = parseInt(dept);
  const low = [36,56,976];
  const high=[75,13,31,35,59,69,92,93,94,34,44];

  if(low.includes(d)) return 0.0509006;
  if(high.includes(d)) return 0.063185;
  return 0.0580665;
}

function showMutationInfo(){
  const d = qs("dept").value.trim();
  if(!d){
    qs("mutation_info").textContent="Landelijk tarief 5,81%";
    return;
  }
  const r = mutationRate(d);
  qs("mutation_info").textContent="Mutationstarief: "+(r*100).toFixed(3)+"%";
}

qs("dept").addEventListener("input", showMutationInfo);

/* ==========================
   NOTARISKOSTEN
========================== */

function calcNotaire(koopsom,typeBien,dept){
  let droits = typeBien==="vefa" ? koopsom*0.00715 : koopsom*mutationRate(dept);
  let emol_ht = koopsom*0.00799+397.25;
  let emol_ttc = emol_ht*1.20;
  let formal=1000, divers=400;
  let secu = Math.max(15, koopsom*0.001);
  return droits + emol_ttc + formal + divers + secu;
}

function showNotaireHint(){
  const achat = parseFloat(qs("prix_achat").value)||0;
  const t = qs("type_bien").value;
  const d = qs("dept").value.trim()||"00";
  const val = calcNotaire(achat,t,d);
  qs("notaire_hint").textContent="Indicatieve notariskosten: €"+val.toLocaleString();
}

qs("prix_achat").addEventListener("input", showNotaireHint);
qs("dept").addEventListener("input", showNotaireHint);
qs("type_bien").addEventListener("change", showNotaireHint);

/* ==========================
   PLUS-VALUE
========================== */

function calcPlusValue(vente,achat,years,mode,achatCout,travaux){

  const brut = vente - achat;
  let costBuy=0, costWork=0;

  if(mode==="forfait"){
    costBuy = achat*0.075;
    costWork = years>=5 ? achat*0.15 : 0;
  } else {
    costBuy = achatCout;
    costWork = travaux;
  }

  const net = brut - costBuy - costWork;

  function abbF(y){
    if(y<6) return 0;
    if(y<=21) return (y-5)*6;
    if(y===22) return 100;
    return 100;
  }
  function abbS(y){
    if(y<6)return 0;
    if(y<=21)return (y-5)*1.65;
    if(y===22)return 16.6;
    if(y<=30)return 16.6+(y-22)*9;
    return 100;
  }

  const aF= Math.min(100,abbF(years));
  const aS= Math.min(100,abbS(years));

  const baseF = net*(1-aF/100);
  const baseS = net*(1-aS/100);

  let imp = baseF*0.19;
  let soc = baseS*0.172;

  if(net<=0){ imp=0; soc=0; }

  return { brut, net, imp, soc, total: imp+soc };
}

/* ==========================
   FACULTATIEVE KOSTEN
========================== */

function facultatieven(role, achat, vente, hyp, mainl, assain, geom){
  let koper=0, verkoper=0;

  if(role==="koper") koper += achat*0.05;
  if(role==="verkoper") verkoper += vente*0.05;

  if(hyp) koper += achat*0.012;
  if(mainl) verkoper += 600;
  if(assain) verkoper += 300;
  if(geom) verkoper += 800;

  return {
    koper: {
      makelaar: role==="koper" ? achat*0.05 : 0,
      hypothee: hyp ? achat*0.012 : 0,
      totaal: koper
    },
    verkoper: {
      makelaar: role==="verkoper" ? vente*0.05 : 0,
      mainlevee: mainl ? 600 : 0,
      assain: assain ? 300 : 0,
      geometre: geom ? 800 : 0,
      totaal: verkoper
    }
  };
}

/* ==========================
   BEREKEN ALLES
========================== */

function calcAll(){

  const achat = parseFloat(qs("prix_achat").value)||0;
  const vente = parseFloat(qs("prix_vente").value)||0;
  const dept = qs("dept").value.trim()||"00";
  const type = qs("type_bien").value;

  const years = parseInt(qs("annees").value)||0;
  const rp = qs("rp").value;
  const pvMode = qs("pv_mode").value;
  const pvA = parseFloat(qs("pv_achat_cout").value)||0;
  const pvT = parseFloat(qs("pv_travaux").value)||0;

  const makRol = qs("opt_makelaar_rol").value;
  const hyp = qs("opt_hypotheek").checked;
  const mainl = qs("opt_mainlevee").checked;
  const assain = qs("opt_assainissement").checked;
  const geom = qs("opt_geometre").checked;

  const notKoper = calcNotaire(achat,type,dept);

  const fac = facultatieven(makRol, achat, vente, hyp, mainl, assain, geom);

  let pv = {total:0, imp:0, soc:0};
  if(rp==="no") pv = calcPlusValue(vente,achat,years,pvMode,pvA,pvT);

  const koperT = notKoper + fac.koper.totaal;
  const verkoperT = pv.total + fac.verkoper.totaal;
  const cumul = koperT + verkoperT;

  qs("result-section").style.display="block";

  qs("result-koper").innerHTML = `
    <div class="result-block">
      <h3>KOPER</h3>
      <table class="result-table">
        <tr><th colspan="2">Notariskosten</th></tr>
        <tr><td>Notariskosten</td><td>€${notKoper.toLocaleString()}</td></tr>

        <tr><th colspan="2">Facultatieve kosten</th></tr>
        <tr><td>Makelaar</td><td>€${fac.koper.makelaar.toLocaleString()}</td></tr>
        <tr><td>Hypotheekgarantie</td><td>€${fac.koper.hypothee.toLocaleString()}</td></tr>
        <tr><td><strong>Totaal facultatief</strong></td><td><strong>€${fac.koper.totaal.toLocaleString()}</strong></td></tr>

        <tr><th colspan="2">Totaal koper</th></tr>
        <tr><td colspan="2"><strong>€${koperT.toLocaleString()}</strong></td></tr>
      </table>
    </div>
  `;

  qs("result-verkoper").innerHTML = `
    <div class="result-block">
      <h3>VERKOPER</h3>
      <table class="result-table">
        <tr><th colspan="2">Plus-Value</th></tr>
        <tr><td>Belasting + Sociale lasten</td><td>€${pv.total.toLocaleString()}</td></tr>

        <tr><th colspan="2">Facultatieve kosten</th></tr>
        <tr><td>Makelaar</td><td>€${fac.verkoper.makelaar.toLocaleString()}</td></tr>
        <tr><td>Mainlevée</td><td>€${fac.verkoper.mainlevee.toLocaleString()}</td></tr>
        <tr><td>Assainissement</td><td>€${fac.verkoker?.assain || fac.verkoper.assain}</td></tr>
        <tr><td>Géomètre</td><td>€${fac.verkoper.geometre.toLocaleString()}</td></tr>
        <tr><td><strong>Totaal facultatief</strong></td><td><strong>€${fac.verkoper.totaal.toLocaleString()}</strong></td></tr>

        <tr><th colspan="2">Totaal verkoper</th></tr>
        <tr><td colspan="2"><strong>€${verkoperT.toLocaleString()}</strong></td></tr>
      </table>
    </div>
  `;

  qs("result-totaal").innerHTML = `
    <div class="result-block">
      <h3>CUMULATIEVE KOSTEN (koper + verkoper)</h3>
      <p><strong>€${cumul.toLocaleString()}</strong></p>
    </div>
  `;

  qs("result-advies").innerHTML = `
    <div class="result-block">
      <h3>Adviezen & Mogelijkheden om te besparen</h3>
      <ul class="advice-list">
        <li>Koper: Kies een caution bancaire i.p.v. hypothèque → lagere kosten + geen mainlevée.</li>
        <li>Verkoper: Gebruik notaris i.p.v. makelaar → tot duizenden euro’s lagere kosten.</li>
        <li>Verkoper: Doe assainissement-rapport vooraf → voorkomt prijsverlaging tijdens onderhandelingen.</li>
        <li>Verkoper: Laat perceelcheck (géomètre) vroeg doen → minder risico op vertraging.</li>
        <li>Algemeen: Check mutationstarief per département voor een realistische kosteninschatting.</li>
      </ul>
    </div>
  `;
}
