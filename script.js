/* ---------------- FAQ + INFOBOX ---------------- */
function toggleInfo(id){
  const box = document.getElementById(id);
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function toggleFAQ(el){
  const a = el.nextElementSibling;
  a.style.display = a.style.display === "block" ? "none" : "block";
}

/* custom-blok zichtbaar maken */
document.getElementById("pv_mode").addEventListener("change", e=>{
  document.getElementById("pv_customblock").style.display =
    e.target.value === "custom" ? "block" : "none";
});

/* ---------------- MUTATION RATE ---------------- */
function mutationRate(d){
  d = parseInt(d);
  const low = [36,56,976];
  const high = [75,13,31,35,59,69,92,93,94,34,44];
  if(low.includes(d)) return 5.09006;
  if(high.includes(d)) return 6.31850;
  return 5.80665;
}

/* ---------------- BEREKENING ---------------- */
function calcAll(){

  /* input verzamelen */
  const achat = +prix_achat.value;
  const vente = +prix_vente.value;
  const dept = dept.value;
  const type = type_bien.value;
  const rp = rp.value;
  const years = +annees.value;
  const pv_mode = pv_mode.value;

  /* notariskosten */
  const droits = type === "vefa" ? achat*0.00715 : achat * (mutationRate(dept)/100);
  const emol_ht = achat*0.00799 + 397.25;
  const emol_ttc = emol_ht * 1.20;
  const formal = 1000;
  const divers = 400;
  const secu = Math.max(15, achat*0.001);

  const total_koper = droits + emol_ttc + formal + divers + secu;

  /* plus-value */
  let pv_html = "";
  let total_verkoper = 0;

  if(rp === "yes"){
    pv_html = "<p>Résidence principale → geen plus-value.</p>";
  } else {
    const brut = vente - achat;

    let buycost = 0, workcost = 0;

    if(pv_mode === "forfait"){
      buycost = achat*0.075;
      workcost = years>=5 ? achat*0.15 : 0;
    } else {
      buycost = +document.getElementById("pv_achat_cout").value;
      workcost = +document.getElementById("pv_travaux").value;
    }

    const net = brut - buycost - workcost;

    function abattFisc(y){
      if(y<6) return 0;
      if(y<=21) return (y-5)*6;
      if(y===22) return 100;
      return 100;
    }

    function abattSoc(y){
      if(y<6) return 0;
      if(y<=21) return (y-5)*1.65;
      if(y===22) return 16.6;
      if(y<=30) return 16.6 + (y-22)*9;
      return 100;
    }

    const aF = Math.min(100, abattFisc(years));
    const aS = Math.min(100, abattSoc(years));

    const baseF = net*(1-aF/100);
    const baseS = net*(1-aS/100);

    const imp = baseF*0.19;
    const soc = baseS*0.172;

    total_verkoper = imp+soc;

    pv_html = `
      <strong>Plus-Value:</strong><br>
      Bruto meerwaarde: €${brut.toLocaleString()}<br>
      Netto: €${net.toLocaleString()}<br>
      Belasting (19%): €${imp.toLocaleString()}<br>
      Sociale heffingen (17,2%): €${soc.toLocaleString()}
    `;
  }

  /* facultatieve kosten */
  let opt_koper = 0, opt_verkoper = 0;

  if(opt_makelaar_koper.checked) opt_koper += achat*0.05;
  if(opt_hypotheek.checked) opt_koper += achat*0.012;

  if(opt_makelaar_verkoper.checked) opt_verkoper += vente*0.05;
  if(opt_mainlevee.checked) opt_verkoper += 600;
  if(opt_assainissement.checked) opt_verkoper += 300;
  if(opt_geometre.checked) opt_verkoper += 800;

  fr_output.innerHTML = `
    <h2>Resultaten</h2>
    <p><strong>Kosten koper (verplicht):</strong> €${total_koper.toLocaleString()}</p>
    <p><strong>Kosten koper (optioneel):</strong> €${opt_koper.toLocaleString()}</p>
    <p><strong>Kosten verkoper (plus-value):</strong> €${total_verkoper.toLocaleString()}</p>
    <p><strong>Kosten verkoper (optioneel):</strong> €${opt_verkoker.toLocaleString()}</p>
    <hr>
    ${pv_html}
  `;
}
