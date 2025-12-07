document.addEventListener('DOMContentLoaded', function() {

    // --- CONFIGURATIE ---
    const CONFIG = {
        notaris_oud: 0.075,
        notaris_nieuw: 0.03,
        makelaar_pct: 0.05,
        pv_tax_rate: 0.362, // 19% + 17.2%
        forfait_aankoop: 0.075,
        forfait_werk: 0.15
    };

    // --- DOM ELEMENTEN ---
    const els = {
        role: document.getElementsByName('role'),
        verkoop: document.getElementById('verkoopprijs'),
        aankoopprijs: document.getElementById('aankoopprijs'),
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

    // --- UI UPDATES & LOCKING ---
    function updateUI() {
        // 1. Departement Hint
        if(els.dept) {
            const d = parseInt(els.dept.value);
            let rate = "5,81%";
            if ([36, 56, 976].includes(d)) rate = "5,09%";
            if ([75, 13, 31, 35, 59, 69, 92, 93, 94, 34, 44].includes(d)) rate = "6,31%";
            if(els.deptHint) els.deptHint.innerText = `Tarief: ${rate}`;
        }

        // 2. Rol Locking
        // We laten de velden open zodat scenario's altijd werken, 
        // maar we triggeren wel een herberekening bij wisselen.
        bereken();
    }

    // --- HOOFDBEREKENING ---
    function bereken() {
        // Inputs ophalen
        const verkoop = safeFloat(els.verkoop.value);
        const aankoop = safeFloat(els.aankoopprijs.value);
        const type = els.type.value;
        const jaren = safeFloat(els.jaren.value);
        const isRP = els.isRP.value === 'ja';
        
        const makelaarEl = document.querySelector('input[name="makelaarWie"]:checked');
        const makelaarWie = makelaarEl ? makelaarEl.value : 'geen';

        let koperKosten = 0;
        let verkoperKosten = 0;
        let koperLijst = "";
        let verkoperLijst = "";

        // --- BEREKENING KOPER ---
        let notarisPct = (type === 'nieuw') ? CONFIG.notaris_nieuw : CONFIG.notaris_oud;
        let notarisBedrag = verkoop * notarisPct;
        koperKosten += notarisBedrag;
        koperLijst += `<li><span>Notariskosten (indicatie)</span> <span>${fmt(notarisBedrag)}</span></li>`;

        if (makelaarWie === 'koper') {
            let mk = verkoop * CONFIG.makelaar_pct;
            koperKosten += mk;
            koperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></li>`;
        }

        if (els.checks.caution && els.checks.caution.checked) {
            let c = 1200; 
            koperKosten += c;
            koperLijst += `<li><span>Hypotheekgarantie</span> <span>${fmt(c)}</span></li>`;
        }

        // --- BEREKENING VERKOPER ---
        if (makelaarWie === 'verkoper') {
            let mk = verkoop * CONFIG.makelaar_pct;
            verkoperKosten += mk;
            verkoperLijst += `<li><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></li>`;
        }

        // Plus-Value (Optie B)
        let pvTax = 0;
        if (!isRP && verkoop > aankoop) {
            let kostenAankoop = aankoop * CONFIG.forfait_aankoop; 
            let kostenWerk = (jaren >= 5) ? (aankoop * CONFIG.forfait_werk) : 0; 
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

        // Overige kosten
        if (els.checks.mainlevee && els.checks.mainlevee.checked) {
            let v = 700; verkoperKosten += v;
            verkoperLijst += `<li><span>Mainlevée</span> <span>${fmt(v)}</span></li>`;
        }
        if (els.checks.spanc && els.checks.spanc.checked) {
            let v = 150; verkoperKosten += v;
            verkoperLijst += `<li><span>SPANC Inspectie</span> <span>${fmt(v)}</span></li>`;
        }
        if (els.checks.geo && els.checks.geo.checked) {
            let v = 1500; verkoperKosten += v;
            verkoperLijst += `<li><span>Géomètre</span> <span>${fmt(v)}</span></li>`;
        }

        // --- TERMINAL DATA ---
        let nettoHand = verkoop - verkoperKosten;
        let werkelijkeWinst = nettoHand - aankoop;
        let totaleFrictie = koperKosten + verkoperKosten;

        // --- OUTPUT UPDATES ---
        if(els.listKoper) els.listKoper.innerHTML = koperLijst;
        if(els.listVerkoper) els.listVerkoper.innerHTML = verkoperLijst;
        if(els.totKoper) els.totKoper.innerText = fmt(koperKosten);
        if(els.totVerkoper) els.totVerkoper.innerText = fmt(verkoperKosten);

        if(els.term.verkoop) {
            els.term.verkoop.innerText = fmt(verkoop);
            els.term.kosten.innerText = "- " + fmt(verkoperKosten);
            els.term.netto.innerText = fmt(nettoHand);
            els.term.aankoop.innerText = "- " + fmt(aankoop);
            els.term.winst.innerText = fmt(werkelijkeWinst);
            els.term.frictie.innerText = fmt(totaleFrictie);
            
            els.term.winst.style.color = werkelijkeWinst >= 0 ? "#00ff41" : "#ff4444";
        }

        if(els.res) els.res.style.display = 'grid';
    }

    // --- LIVE LISTENERS TOEVOEGEN ---
    // Dit zorgt ervoor dat ALLES direct reageert
    const inputs = [
        els.verkoop, els.aankoopprijs, els.dept, els.type, els.jaren, els.isRP,
        els.checks.caution, els.checks.mainlevee, els.checks.spanc, els.checks.geo
    ];

    inputs.forEach(el => {
        if(el) {
            el.addEventListener('input', bereken);
            el.addEventListener('change', bereken);
        }
    });

    els.makelaarWie.forEach(r => r.addEventListener('change', bereken));
    els.role.forEach(r => r.addEventListener('change', updateUI));
    if(els.btn) els.btn.addEventListener('click', bereken);

    // Eerste start
    updateUI();
});
