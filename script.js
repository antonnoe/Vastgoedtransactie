/* -------------------------------------------------------
   BASIS HULPFUNCTIES
------------------------------------------------------- */

function qs(id){
  return document.getElementById(id);
}

function toggleInfo(id){
  const box = qs(id);
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function toggleFAQ(el){
  const a = el.nextElementSibling;
  a.style.display = a.style.display === "block" ? "none" : "block";
}

/* -------------------------------------------------------
   ROL LOGICA (KOPER / VERKOPER)
------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  updateRoleUI();
});

document.querySelectorAll("input[name='role']").forEach(r => {
  r.addEventListener("change", updateRoleUI);
});

function updateRoleUI(){
  const isKoper = qs("role_koper").checked;
  const isVerkoper = qs("role_verkoper").checked;

  qs("prix_achat").disabled = !isKoper;
  qs("dept").disabled = !isKoper;

  qs("prix_vente").disabled = !isVerkoper;
  qs("annees").disabled = !isVerkoper;
  qs("rp").disabled = !isVerkoper;

  qs("pv-section").style.display = isVerkoper ? "block" : "none";
}

/* -------------------------------------------------------
   MUTATIONSTARIEF
------------------------------------------------------- */

function mutationRate(dept){
  const d = parseInt(dept);
  const low = [36, 56, 976];
  const high = [75,13,31,35,59,69,92,93,94,34,44];

  if(low.includes(d)) return 0.0509006;
  if(high.includes(d)) return 0.063185;
  return 0.0580665;
}

function showMutationInfo(){
  const d = qs("dept").value.trim();
  if(!d){
    qs("mutation_info").textContent = "Landelijk tarief toegepast (5,81%)";
    return;
  }
  const rate = mutationRate(d);
  qs("mutation_info").textContent = "Mutationstarief: " + (rate*100).toFixed(3) + "%";
}

qs("dept").addEventListener("input", showMutationInfo);

/* -------------------------------------------------------
   NOTARISKOSTEN BEREKENING (INDICATIEF)
------------------------------------------------------- */

function calcNotaire(koopsom, typeBien, dept){
  let droits = typeBien === "vefa" ? koopsom * 0.00715 : koopsom * mutationRate(dept);
  let emol_ht = koopsom * 0.00799 + 397.25;
  let emol_ttc = emol_ht * 1.20;
  let formal = 1000;
  let divers = 400;
  let secu = Math.max(15, koopsom * 0.001);
  return droits + emol_ttc + formal + divers + secu;
}

function showNotaireHint(){
  const isKoper = qs("role_koper").checked;
  if(!isKoper){
    qs("notaire_hint").textContent = "";
    return;
  }
  const koopsom = parseFloat(qs("prix_achat").value) || 0;
  const typeBien = qs("type_bien").value;
  const dept = qs("dept").value.trim() || "00";
  const val = calcNotaire(koopsom, typeBien, dept);
  qs("notaire_hint").textContent = "Indicatieve notariskosten: €" + val.toLocaleString();
}

qs("prix_achat").addEventListener("input", showNotaireHint);
qs("type_bien").addEventListener("change", showNotaireHint);
qs("dept").addEventListener("input", showNotaireHint);

/* -------------------------------------------------------
   PLUS-VALUE BEREKENING
------------------------------------------------------- */

function calcPlusValue(vente, achat, years, mode, achatCout, travaux){
  const brut = vente - achat;
  let costBuy = 0;
  let costWork = 0;

  if(mode === "forfait"){
    costBuy = achat * 0.075;
    costWork = years >= 5 ? achat * 0.15 : 0;
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
    if(y<6) return 0;
    if(y<=21) return (y-5)*1.65;
    if(y===22) return 16.6;
    if(y<=30) return 16.6 + (y-22)*9;
    return 100;
  }

  const aF = Math.min(100, abbF(years));
  const aS = Math.min(100, abbS(years));

  const baseF = net * (1 - aF/100);
  const baseS = net * (1 - aS/100);

  const imp = baseF * 0.19;
  const soc = baseS * 0.172;

  return {
    brut: brut,
    net: net,
    impots: imp,
    sociaux: soc,
    total: imp + soc
  };
}

/* -------------------------------------------------------
   FACULTATIEVE POSTEN
------------------------------------------------------- */

function facultatieven(rolMakelaar, achat, vente, hyp, mainl, assain, geom){
  let koper = 0;
  let verkoper = 0;

  if(rolMakelaar === "koper") koper += achat * 0.05;
  if(rolMakelaar === "verkoper") verkoper += vente * 0.05;

  if(hyp) koper += achat * 0.012;
  if(mainl) verkeler = 0; // typo fix needed
  if(mainl) verkoper += 600;
  if(assain) verkoper += 300;
  if(geom) verkoper += 800;

  return { koper, verkoper };
}

/* -------------------------------------------------------
   HOOFDBEREKENING
------------------------------------------------------- */

function calcAll(){

  const isKoper = qs("role_koper").checked;
  const isVerkoper = qs("role_verkoper").checked;

  const achat = parseFloat(qs("prix_achat").value) || 0;
  const vente = parseFloat(qs("prix_vente").value) || 0;
  const dept = qs("dept").value.trim() || "00";
  const typeBien = qs("type_bien").value;

  const years = parseInt(qs("annees").value) || 0;
  const rp = qs("rp").value;
  const pvMode = qs("pv_mode").value;
  const pvA = parseFloat(qs("pv_achat_cout").value) || 0;
  const pvT = parseFloat(qs("pv_travaux").value) || 0;

  /* Facultatieve data */
  const makRol = qs("opt_makelaar_rol").value;
  const hyp = qs("opt_hypotheek").checked;
  const mainl = qs("opt_mainlevee").checked;
  const assain = qs("opt_assainissement").checked;
  const geom = qs("opt_geometre").checked;

  /* BEREKEN NOTARIS VOOR KOPER */
  let notKoper = 0;
  if(isKoper){
    notKoper = calcNotaire(achat, typeBien, dept);
  } else {
    /* zelfs bij verkoper tonen we dit als informatie */
    notKoper = calcNotaire(achat, typeBien, dept);
  }

  /* FACULTATIEVE POSTEN */
  const fac = facultatieven(makRol, achat, vente, hyp, mainl, assain, geom);

  /* PLUS-VALUE */
  let pv = {brut:0,net:0,impots:0,sociaux:0,total:0};
  if(isVerkoper){
    if(rp === "yes"){
      pv = {brut:0, net:0, impots:0, sociaux:0, total:0};
    } else {
      pv = calcPlusValue(vente, achat, years, pvMode, pvA, pvT);
    }
  }

  const koperTotaal = notKoper + fac.koper;
  const verkoperTotaal = pv.total + fac.verkoper;
  const totaal = koperTotaal + verkoperTotaal;

  /* OUTPUT */
  qs("result-section").style.display = "block";

  qs("result-koper").innerHTML =
    "<div class='result-block'>"+
    "<h3>Wat betaalt de koper?</h3>"+
    "<table class='result-table'>"+
      "<tr><th>Kostenpost</th><th>Bedrag</th></tr>"+
      "<tr><td>Notariskosten</td><td>€"+notKoper.toLocaleString()+"</td></tr>"+
      "<tr><td>Facultatieve kosten</td><td>€"+fac.koper.toLocaleString()+"</td></tr>"+
      "<tr><td><strong>TOTAAL</strong></td><td><strong>€"+koperTotaal.toLocaleString()+"</strong></td></tr>"+
    "</table>"+
    "</div>";

  qs("result-verkoper").innerHTML =
    "<div class='result-block'>"+
    "<h3>Wat betaalt de verkoper?</h3>"+
    "<table class='result-table'>"+
      "<tr><th>Kostenpost</th><th>Bedrag</th></tr>"+
      "<tr><td>Plus-value</td><td>€"+pv.total.toLocaleString()+"</td></tr>"+
      "<tr><td>Facultatieve kosten</td><td>€"+fac.verkoper.toLocaleString()+"</td></tr>"+
      "<tr><td><strong>TOTAAL</strong></td><td><strong>€"+verkoperTotaal.toLocaleString()+"</strong></td></tr>"+
    "</table>"+
    "</div>";

  qs("result-totaal").innerHTML =
    "<div class='result-block'>"+
    "<h3>Totale transactiekosten</h3>"+
    "<p><strong>Totaal koper:</strong> €"+koperTotaal.toLocaleString()+"</p>"+
    "<p><strong>Totaal verkoper:</strong> €"+verkoperTotaal.toLocaleString()+"</p>"+
    "<p><strong>TOTALE FRICTIE:</strong> €"+totaal.toLocaleString()+"</p>"+
    "</div>";
}

/* INIT */
showMutationInfo();
showNotaireHint();
