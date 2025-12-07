// --- CONFIGURATIE ---
const CONFIG = {
    notaris_oud: 0.075,
    notaris_nieuw: 0.03,
    makelaar_pct: 0.05,
    pv_tax_rate: 0.362, // 19% + 17.2%
    forfait_aankoop: 0.075,
    forfait_werk: 0.15
};

// --- DOM ELEMENTEN (Caching) ---
// Let op: roleDesc is hier verwijderd om crashes te voorkomen
const els = {
    role: document.getElementsByName('role'),
    verkoop: document.getElementById('verkoopprijs'),
    aankoop: document.getElementById('aankoopprijs'),
    dept: document.getElementById('dept'),
    deptHint: document.getElementById('dept-hint'),
    type: document.getElementById('typeWoning'),
    jaren: document.getElementById('jaren'),
    isRP: document.getElementById('isRP'),
    makelaarWie: document.getElementsByName('makelaarWie'),
    checks: {
        caution: document.getElementById('opt_caution'),
        mainlevee: document.getElementById('opt_mainlevee'),
        spanc: document.getElementById('opt_spanc'),
        geo: document.getElementById('opt_geo')
    },
    btn: document.getElementById('btnBereken'),
    res: document.getElementById('resultaten'),
    listKoper: document.getElementById('list-koper'),
    listVerkoper: document.getElementById('list-verkoper'),
    totKoper: document.getElementById('tot-koper'),
    totVerkoper: document.getElementById('tot-verkoper'),
    term: {
        verkoop: document.getElementById('term-verkoop'),
        kosten: document.getElementById('term-kosten'),
        netto: document.getElementById('term-netto'),
        aankoop: document.getElementById('term-aankoop'),
        winst: document.getElementById('term-winst'),
        frictie: document.getElementById('term-frictie')
    }
};

// --- HELPER FUNCTIES ---
const fmt = (n) => n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
const safeFloat = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

// --- LOGICA ---

function updateUI() {
    // 1. Departement Hint
    const d = parseInt(els.dept.value);
    let rate = "5,81%";
    if ([36, 56, 976].includes(d)) rate = "5,09%";
    if ([75, 13, 31, 35, 59, 69, 92, 93, 94, 34, 44].includes(d)) rate = "6,31%";
    els.deptHint.innerText = `Tarief: ${rate}`;

    // 2. Rol Locking (alleen de velden disablen, geen tekst updates meer)
    const role = document.querySelector('input[name="role"]:checked').value;
    
    // Reset alles naar enabled
    els.verkoop.disabled = false;
    els.aankoopprijs.disabled = false;

    if (role === 'koper') {
        // Koper kan aankoop historie vaak niet weten of invullen, maar voor scenario laten we het open.
        // Optioneel: els.aankoopprijs.disabled = true;
    } 
    // Verkoper en Notaris hebben alles open.
}

function bereken() {
    // Inputs ophalen (veilig)
    const verkoop = safeFloat(els.verkoop.value);
    const aankoop = safeFloat(els.aankoopprijs.value);
    const type = els.type.value;
    const jaren = safeFloat(els.jaren.value);
    const isRP = els.isRP.value === 'ja';
    
    // Check of makelaar radio bestaat en geselecteerd is
    const makelaarEl = document.querySelector('input[name="makelaarWie"]:checked');
    const makelaarWie = makelaarEl ? makelaarEl.value : 'geen';

    let koperKosten = 0;
    let verkoperKosten = 0;
    let koperLijst = "";
    let verkoperLijst = "";

    // --- BEREKENING KOPER ---
    
    // 1. Notaris
    let notarisPct = (type === 'nieuw') ? CONFIG.notaris_nieuw : CONFIG.notaris_oud;
    let notarisBedrag = verkoop * notarisPct;
    koperKosten += notarisBedrag;
    koperLijst += `<li><span>Notariskosten (indicatie)</span> <span>${fmt(notarisBedrag)}</span></li>`;

    // 2. Makelaar (als Koper betaalt)
    if (makelaarWie === 'koper') {
        let mk = verkoop * CONFIG.makelaar_pct;
        koperKosten += mk;
        koperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></li>`;
    }

    // 3. Caution
    if (els.checks.caution.checked) {
        let c = 1200; 
        koperKosten += c;
        koperLijst += `<li><span>Hypotheekgarantie</span> <span>${fmt(c)}</span></li>`;
    }

    // --- BEREKENING VERKOPER ---

    // 1. Makelaar (als Verkoper betaalt)
    if (makelaarWie === 'verkoper') {
        let mk = verkoop * CONFIG.makelaar_pct;
        verkoperKosten += mk;
        verkoperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></li>`;
    }

    // 2. Plus-Value (Optie B Forfaitair)
    let pvTax = 0;
    if (!isRP && verkoop > aankoop) {
        // Bereken forfaitaire kosten
        let kostenAankoop = aankoop * CONFIG.forfait_aankoop; // 7.5%
        let kostenWerk = (jaren >= 5) ? (aankoop * CONFIG.forfait_werk) : 0; // 15% na 5 jaar
        
        let totaleAankoopSom = aankoop + kostenAankoop + kostenWerk;
        let brutoWinst = verkoop - totaleAankoopSom;

        if (brutoWinst > 0) {
            pvTax = brutoWinst * CONFIG.pv_tax_rate;
        }
    }

    if (isRP) {
        verkoperLijst += `<li><span>Plus-Value</span> <span>Vrijgesteld (Hoofdverblijf)</span></li>`;
    } else {
        verkoperLijst += `<li><span>Plus-Value (Schatting)</span> <span>${fmt(pvTax)}</span></li>`;
        verkoperKosten += pvTax;
    }

    // 3. Overige kosten verkoper
    if (els.checks.mainlevee.checked) {
        let v = 700; verkoperKosten += v;
        verkoperLijst += `<li><span>Mainlevée</span> <span>${fmt(v)}</span></li>`;
    }
    if (els.checks.spanc.checked) {
        let v = 150; verkoperKosten += v;
        verkoperLijst += `<li><span>SPANC Inspectie</span> <span>${fmt(v)}</span></li>`;
    }
    if (els.checks.geo.checked) {
        let v = 1500; verkoperKosten += v;
        verkoperLijst += `<li><span>Géomètre</span> <span>${fmt(v)}</span></li>`;
    }

    // --- TERMINAL DATA (Frictie & Netto) ---
    // Netto in hand verkoper = Verkoop - Totale Kosten Verkoper
    let nettoHand = verkoop - verkoperKosten;
    let werkelijkeWinst = nettoHand - aankoop;
    let totaleFrictie = koperKosten + verkoperKosten;

    // --- DOM UPDATES ---
    els.listKoper.innerHTML = koperLijst;
    els.listVerkoper.innerHTML = verkoperLijst;
    els.totKoper.innerText = fmt(koperKosten);
    els.totVerkoper.innerText = fmt(verkoperKosten);

    // Terminal vullen
    els.term.verkoop.innerText = fmt(verkoop);
    els.term.kosten.innerText = "- " + fmt(verkoperKosten);
    els.term.netto.innerText = fmt(nettoHand);
    els.term.aankoop.innerText = "- " + fmt(aankoop);
    els.term.winst.innerText = fmt(werkelijkeWinst);
    els.term.frictie.innerText = fmt(totaleFrictie);

    // Winst kleur
    els.term.winst.style.backgroundColor = werkelijkeWinst >= 0 ? "#00ff41" : "#ff4444";
    els.term.winst.style.color = "#000";

    els.res.style.display = 'grid';
}

// --- INITIALISATIE ---
// Event Listeners koppelen
els.role.forEach(r => r.addEventListener('change', updateUI));
els.dept.addEventListener('input', updateUI);
els.btn.addEventListener('click', bereken);

// Start
updateUI();
