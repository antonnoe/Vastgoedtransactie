// Configuratie
const TARIEVEN = {
    notaris_oud: 0.075, // Indicatief 7.5%
    notaris_nieuw: 0.03, // Indicatief 3%
    makelaar_pct: 0.05, // 5%
    plus_value_tax: 0.362, // 19% + 17.2%
    forfait_aankoop: 0.075, // 7.5% forfait aankoopkosten
    forfait_werk: 0.15 // 15% forfait werkzaamheden
};

// DOM Elementen
const els = {
    role: document.getElementsByName('role'),
    verkoopprijs: document.getElementById('verkoopprijs'),
    aankoopprijs: document.getElementById('aankoopprijs'),
    dept: document.getElementById('dept'),
    deptHint: document.getElementById('dept-hint'),
    typeWoning: document.getElementById('typeWoning'),
    jaren: document.getElementById('jaren'),
    isRP: document.getElementById('isRP'),
    makelaarWie: document.getElementsByName('makelaarWie'),
    optCaution: document.getElementById('opt_caution'),
    optMainlevee: document.getElementById('opt_mainlevee'),
    optSpanc: document.getElementById('opt_spanc'),
    optGeo: document.getElementById('opt_geo'),
    resultaten: document.getElementById('resultaten'),
    listKoper: document.getElementById('list-koper'),
    listVerkoper: document.getElementById('list-verkoper'),
    totKoper: document.getElementById('tot-koper'),
    totVerkoper: document.getElementById('tot-verkoper'),
    totGeneraal: document.getElementById('tot-generaal')
};

// 1. Rol Logica (Wie mag wat invullen?)
function updateRoleLock() {
    let role = document.querySelector('input[name="role"]:checked').value;
    
    // Reset disables
    els.verkoopprijs.disabled = false;
    els.aankoopprijs.disabled = false;

    if (role === 'koper') {
        // Koper weet meestal niet de historische aankoopprijs, maar voor de tool
        // is het handig als het wel kan, of we locken het.
        // Volgens jouw wens: Koper ziet zijn kosten. 
        // We laten velden open zodat hij kan spelen, OF we locken historische aankoop.
        // Gezien de frustratie: OPEN LATEN is veiliger voor scenario's, 
        // maar strikt genomen weet koper aankoopbedrag niet. 
        // Laten we het open laten (Scenario modus idee) tenzij je echt wil locken.
        // In vorige chat wilde je locken.
        els.aankoopprijs.disabled = true; // Koper koopt nu, historie onbekend
    } else if (role === 'verkoper') {
        // Verkoper moet alles kunnen invullen voor plus-value
        // HIER ZAT DE BUG: Verkoper mag natuurlijk verkoopprijs bepalen!
        els.verkoopprijs.disabled = false;
        els.aankoopprijs.disabled = false;
    } 
    // Notaris: alles open
}

// Event Listeners voor Rol
els.role.forEach(r => r.addEventListener('change', updateRoleLock));

// Dept Lookup (Simpel)
els.dept.addEventListener('input', function() {
    const d = parseInt(this.value);
    let rate = "5,81%";
    if ([36, 56, 976].includes(d)) rate = "5,09%";
    if ([75, 13, 31, 35, 59, 69, 92, 93, 94, 34, 44].includes(d)) rate = "6,31%";
    els.deptHint.innerText = `Tarief in dept ${this.value || '..'}: ${rate}`;
});

// Helper: Format Euro
const fmt = (n) => n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });

// 2. Hoofdberekening
function berekenAlles() {
    // Waarden ophalen
    const verkoop = parseFloat(els.verkoopprijs.value) || 0;
    const aankoop = parseFloat(els.aankoopprijs.value) || 0;
    const dept = parseInt(els.dept.value) || 0;
    const type = els.typeWoning.value;
    const jaren = parseInt(els.jaren.value) || 0;
    const isRP = els.isRP.value === 'ja';
    const makelaarWie = document.querySelector('input[name="makelaarWie"]:checked').value;

    let koperKosten = 0;
    let verkoperKosten = 0;
    let koperLijst = "";
    let verkoperLijst = "";

    // --- A. KOSTEN KOPER ---

    // 1. Notariskosten (Indicatief)
    let notarisPct = (type === 'nieuw') ? TARIEVEN.notaris_nieuw : TARIEVEN.notaris_oud;
    let notarisBedrag = verkoop * notarisPct;
    
    // Mutatietarief correctie (zit vaak in notaris, maar voor precisie):
    // We houden de simpele regel aan: 7.5% totaal voor oud, 3% voor nieuw.
    // Dit dekt droits de mutation + emolumenten.
    koperKosten += notarisBedrag;
    koperLijst += `<li><span>Notariskosten (indicatie)</span> <span>${fmt(notarisBedrag)}</span></li>`;

    // 2. Makelaar (als Koper betaalt)
    if (makelaarWie === 'koper') {
        let makelaar = verkoop * TARIEVEN.makelaar_pct;
        koperKosten += makelaar;
        koperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(makelaar)}</span></li>`;
    }

    // 3. Facultatief Koper
    if (els.optCaution.checked) {
        let caution = 1200; // vast bedrag indicatie
        koperKosten += caution;
        koperLijst += `<li><span>Caution Bancaire</span> <span>${fmt(caution)}</span></li>`;
    }

    // --- B. KOSTEN VERKOPER ---

    // 1. Makelaar (als Verkoper betaalt)
    if (makelaarWie === 'verkoper') {
        let makelaar = verkoop * TARIEVEN.makelaar_pct;
        verkoperKosten += makelaar;
        verkoperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(makelaar)}</span></li>`;
    }

    // 2. Plus-Value (OPTIE B: Forfaitaire berekening)
    // Formule: Winst = Verkoop - (Aankoop + 7.5% aankoopkosten + 15% werk)
    let plusValueTax = 0;
    if (!isRP && verkoop > aankoop) {
        let forfaitAankoop = aankoop * TARIEVEN.forfait_aankoop;
        let forfaitWerk = 0;
        
        // Werk forfait geldt alleen na 5 jaar
        if (jaren >= 5) {
            forfaitWerk = aankoop * TARIEVEN.forfait_werk;
        }

        let gecorrigeerdeAankoop = aankoop + forfaitAankoop + forfaitWerk;
        let brutoWinst = verkoop - gecorrigeerdeAankoop;

        if (brutoWinst > 0) {
            // Abattementen (vereenvoudigd voor deze tool, want de gebruiker wilde Optie B Forfait)
            // Maar Optie B impliceert vaak een snelle berekening zonder complexe staffels
            // Tenzij we de staffels toepassen op de bruto winst.
            // Gezien de wens voor "Simpel Forfait":
            plusValueTax = brutoWinst * TARIEVEN.plus_value_tax;
        }
    }
    
    if (!isRP && plusValueTax > 0) {
        verkoperKosten += plusValueTax;
        verkoperLijst += `<li><span>Plus-Value (Schatting)</span> <span>${fmt(plusValueTax)}</span></li>`;
    } else if (isRP) {
        verkoperLijst += `<li><span>Plus-Value</span> <span>Vrijgesteld (Hoofdverblijf)</span></li>`;
    } else {
        verkoperLijst += `<li><span>Plus-Value</span> <span>€ 0,00</span></li>`;
    }

    // 3. Facultatief Verkoper
    if (els.optMainlevee.checked) {
        let v = 700; verkoperKosten += v;
        verkoperLijst += `<li><span>Mainlevée</span> <span>${fmt(v)}</span></li>`;
    }
    if (els.optSpanc.checked) {
        let v = 150; verkoperKosten += v; // inspectie kost
        verkoperLijst += `<li><span>SPANC Inspectie</span> <span>${fmt(v)}</span></li>`;
    }
    if (els.optGeo.checked) {
        let v = 1500; verkoperKosten += v;
        verkoperLijst += `<li><span>Géomètre</span> <span>${fmt(v)}</span></li>`;
    }

    // --- OUTPUT ---
    els.listKoper.innerHTML = koperLijst;
    els.listVerkoper.innerHTML = verkoperLijst;
    els.totKoper.innerText = fmt(koperKosten);
    els.totVerkoper.innerText = fmt(verkoperKosten);
    els.totGeneraal.innerText = fmt(koperKosten + verkoperKosten);
    
    els.resultaten.style.display = 'grid';
}

// Initialiseer locks
updateRoleLock();
