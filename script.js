document.addEventListener('DOMContentLoaded', function() {

    // --- CONFIGURATIE 2025 (Wettelijke Staffels) ---
    const CONFIG = {
        // Notaris Emolumenten (Loon) Tranches
        tranches: [
            { limit: 6500, rate: 0.03870 },
            { limit: 17000, rate: 0.01596 },
            { limit: 60000, rate: 0.01064 },
            { limit: Infinity, rate: 0.00799 }
        ],
        notaris_btw: 0.20,
        notaris_overig: 1200, // Aktekosten, formaliteiten
        dmto_std: 0.0581,     // Standaard departementen
        dmto_low: 0.0509,     // Enkele uitzonderingen (Indre, Morbihan etc)
        
        makelaar_pct: 0.05,
        
        // Plus-Value Forfaits
        forfait_aankoop: 0.075, // 7.5% aankoopkosten
        forfait_werk: 0.15,     // 15% verbouwing (na 5 jaar)
        
        // Belastingtarieven
        tax_ir: 0.19,     // Inkomstenbelasting
        tax_csg: 0.172    // Sociale lasten
    };

    // --- DOM ELEMENTEN ---
    const els = {
        typeWoning: document.getElementsByName('typeWoning'),
        isRP: document.getElementsByName('isRP'),
        makelaarWie: document.getElementsByName('makelaarWie'),
        
        verkoop: document.getElementById('verkoopprijs'),
        aankoop: document.getElementById('aankoopprijs'),
        dept: document.getElementById('dept'),
        deptHint: document.getElementById('dept-hint'),
        jaren: document.getElementById('jaren'),
        
        // Checkboxes
        checks: {
            caution: document.getElementById('opt_caution'),
            mainlevee: document.getElementById('opt_mainlevee'),
            spanc: document.getElementById('opt_spanc'),
            geo: document.getElementById('opt_geo')
        },
        
        // Outputs
        listKoper: document.getElementById('list-koper'),
        listVerkoper: document.getElementById('list-verkoper'),
        totKoper: document.getElementById('tot-koper'),
        totVerkoper: document.getElementById('tot-verkoper'),
        
        // Terminal
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
    const getRadioVal = (name) => {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : null;
    };

    // --- BEREKENING NOTARIS (Exacte Methode) ---
    function berekenNotaris(prijs, type, deptNummer) {
        // 1. Nieuwbouw (VEFA) is goedkoper
        if (type === 'nieuw') {
            return {
                totaal: prijs * 0.025, // Ca. 2.5%
                uitleg: "Gereduceerd tarief voor nieuwbouw (VEFA)"
            };
        }

        // 2. Overdrachtsbelasting (DMTO)
        // 36 (Indre), 56 (Morbihan), 976 (Mayotte) zijn vaak lager. Rest is 5.81%
        const lowDepts = [36, 56, 976]; 
        const dmtoRate = lowDepts.includes(deptNummer) ? CONFIG.dmto_low : CONFIG.dmto_std;
        const dmto = prijs * dmtoRate;

        // 3. Emolumenten (Loon notaris) via Staffels
        let emolument = 0;
        let remaining = prijs;
        let previousLimit = 0;

        CONFIG.tranches.forEach(tranche => {
            if (remaining > 0) {
                let schijfRuimte = tranche.limit - previousLimit;
                let teBelasten = Math.min(remaining, schijfRuimte);
                
                // Bij de laatste tranche (Infinity) pakken we gewoon de rest
                if (tranche.limit === Infinity) teBelasten = remaining;

                emolument += teBelasten * tranche.rate;
                remaining -= teBelasten; // Als teBelasten negatief wordt, stopt het vanzelf
                
                // Correctie voor loop
                if (remaining < 0) remaining = 0; 
                previousLimit = tranche.limit;
            }
        });

        const btw = emolument * CONFIG.notaris_btw;
        const totaal = dmto + emolument + btw + CONFIG.notaris_overig;

        return {
            totaal: totaal,
            uitleg: `DMTO (${(dmtoRate*100).toFixed(2)}%) + Wettelijk loon + BTW`
        };
    }

    // --- BEREKENING PLUS-VALUE (De Echte Franse Methode) ---
    function berekenPlusValue(verkoop, aankoop, jaren, isHoofdverblijf) {
        if (isHoofdverblijf) {
            return { tax: 0, social: 0, msg: "Vrijstelling: Hoofdverblijf" };
        }
        if (verkoop <= aankoop) {
            return { tax: 0, social: 0, msg: "Geen winst = Geen belasting" };
        }

        // 1. Bepaal Forfaits
        // Aankoopkosten: Werkelijk of 7.5%
        let kostenAankoop = aankoop * CONFIG.forfait_aankoop;
        
        // Werkzaamheden: 15% mits > 5 jaar bezit
        let kostenWerk = (jaren >= 5) ? (aankoop * CONFIG.forfait_werk) : 0;
        let werkMsg = (jaren >= 5) ? "Incl. 15% verbouwingsforfait" : "Geen werkforfait (< 5 jaar)";

        // Bruto Winst
        let gecorrigeerdeAankoop = aankoop + kostenAankoop + kostenWerk;
        let brutoWinst = verkoop - gecorrigeerdeAankoop;

        if (brutoWinst <= 0) return { tax: 0, social: 0, msg: "Winst verdampt door forfaits" };

        // 2. Aftrek (Abattement) Tafels
        let kortingTax = 0;   // Voor IR (19%)
        let kortingSocial = 0; // Voor CSG (17.2%)

        // Spoor 1: Inkomstenbelasting (Vrij na 22 jaar)
        if (jaren > 5) {
            if (jaren <= 21) kortingTax = (jaren - 5) * 0.06;
            else if (jaren === 22) kortingTax = 1.00; // 22e jaar sluit het gat
            else kortingTax = 1.00;
        }

        // Spoor 2: Sociale Lasten (Vrij na 30 jaar)
        if (jaren > 5) {
            if (jaren <= 21) kortingSocial = (jaren - 5) * 0.0165;
            else if (jaren === 22) kortingSocial = 0.28; // (16 * 1.65) + 1.60
            else if (jaren <= 30) kortingSocial = 0.28 + ((jaren - 22) * 0.09);
            else kortingSocial = 1.00;
        }

        // Maximeren op 100% (1.0)
        kortingTax = Math.min(kortingTax, 1);
        kortingSocial = Math.min(kortingSocial, 1);

        // 3. Bereken de verschuldigde belasting
        let baseTax = brutoWinst * (1 - kortingTax);
        let baseSocial = brutoWinst * (1 - kortingSocial);

        let teBetalenTax = baseTax * CONFIG.tax_ir;
        let teBetalenSocial = baseSocial * CONFIG.tax_csg;

        // Context tekst samenstellen
        let explanation = "";
        if (jaren >= 30) explanation = "Volledige vrijstelling (30+ jaar)";
        else if (jaren >= 22) explanation = "Geen IR (22j+), alleen Sociale Lasten";
        else explanation = `Aftrek: ${(kortingTax*100).toFixed(0)}% op IR, ${(kortingSocial*100).toFixed(1)}% op CSG. ${werkMsg}`;

        return {
            tax: teBetalenTax,
            social: teBetalenSocial,
            msg: explanation
        };
    }

    // --- CORE LOGIC ---
    function updateCalculator() {
        // Inputs ophalen
        const verkoop = safeFloat(els.verkoop.value);
        const aankoop = safeFloat(els.aankoop.value);
        const deptNum = parseInt(els.dept.value) || 75;
        const jaren = safeFloat(els.jaren.value);
        
        const typeWoning = getRadioVal('typeWoning');
        const isRP = getRadioVal('isRP') === 'ja';
        const makelaarWie = getRadioVal('makelaarWie');

        // Dept Hint
        if(els.deptHint) {
            els.deptHint.innerText = ([36,56,976].includes(deptNum)) ? "Tarief: Verlaagd" : "Tarief: Standaard";
        }

        // Containers
        let koperKosten = 0;
        let verkoperKosten = 0;
        let koperHTML = "";
        let verkoperHTML = "";

        // --- 1. KOPER BEREKENING ---
        // Notaris
        const notarisData = berekenNotaris(verkoop, typeWoning, deptNum);
        koperKosten += notarisData.totaal;
        koperHTML += `
            <li>
                <div class="cost-row-main"><span>Notariskosten</span> <span>${fmt(notarisData.totaal)}</span></div>
                <div class="context-info">${notarisData.uitleg}</div>
            </li>`;

        // Makelaar (als koper betaalt)
        if (makelaarWie === 'koper') {
            let mk = verkoop * CONFIG.makelaar_pct;
            koperKosten += mk;
            koperHTML += `
                <li>
                    <div class="cost-row-main"><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></div>
                    <div class="context-info">Ca. 5% betaald door koper</div>
                </li>`;
        }

        // Opties Koper
        if (els.checks.caution.checked) {
            let c = 1200; // vast bedrag ter illustratie
            koperKosten += c;
            koperHTML += `<li><div class="cost-row-main"><span>Hypotheekgarantie</span> <span>${fmt(c)}</span></div></li>`;
        }

        // --- 2. VERKOPER BEREKENING ---
        // Makelaar (als verkoper betaalt)
        if (makelaarWie === 'verkoper') {
            let mk = verkoop * CONFIG.makelaar_pct;
            verkoperKosten += mk;
            verkoperHTML += `
                <li>
                    <div class="cost-row-main"><span>Makelaarscourtage</span> <span>${fmt(mk)}</span></div>
                    <div class="context-info">In mindering op verkooprijs</div>
                </li>`;
        }

        // Plus-Value (Winstbelasting)
        // Let op: Makelaarskosten mogen van de verkoopprijs af als verkoper betaalt
        let nettoVerkoopVoorTax = verkoop;
        if (makelaarWie === 'verkoper') nettoVerkoopVoorTax -= (verkoop * CONFIG.makelaar_pct);

        const pvData = berekenPlusValue(nettoVerkoopVoorTax, aankoop, jaren, isRP);
        const totaalPV = pvData.tax + pvData.social;
        
        if (isRP) {
             verkoperHTML += `
                <li>
                    <div class="cost-row-main"><span>Plus-Value Belasting</span> <span>Vrijgesteld</span></div>
                    <div class="context-info">Hoofdverblijf is altijd 100% vrijgesteld</div>
                </li>`;
        } else {
            verkoperKosten += totaalPV;
            verkoperHTML += `
                <li>
                    <div class="cost-row-main"><span>Plus-Value Belasting</span> <span>${fmt(totaalPV)}</span></div>
                    <div class="context-info">${pvData.msg}</div>
                </li>`;
        }

        // Opties Verkoper
        if (els.checks.mainlevee.checked) {
            let v = 700; verkoperKosten += v;
            verkoperHTML += `<li><div class="cost-row-main"><span>Mainlevée</span> <span>${fmt(v)}</span></div></li>`;
        }
        if (els.checks.spanc.checked) {
            let v = 150; verkoperKosten += v;
            verkoperHTML += `<li><div class="cost-row-main"><span>SPANC Inspectie</span> <span>${fmt(v)}</span></div></li>`;
        }
        if (els.checks.geo.checked) {
            let v = 1500; verkoperKosten += v;
            verkoperHTML += `<li><div class="cost-row-main"><span>Géomètre</span> <span>${fmt(v)}</span></div></li>`;
        }

        // --- 3. RENDERING ---
        els.listKoper.innerHTML = koperHTML;
        els.totKoper.innerText = fmt(koperKosten);
        
        els.listVerkoper.innerHTML = verkoperHTML;
        els.totVerkoper.innerText = fmt(verkoperKosten);

        // Terminal Data
        let nettoHand = verkoop - verkoperKosten;
        let werkelijkeWinst = nettoHand - aankoop;
        let totaleFrictie = koperKosten + verkoperKosten;

        els.term.verkoop.innerText = fmt(verkoop);
        els.term.kosten.innerText = "- " + fmt(verkoperKosten);
        els.term.netto.innerText = fmt(nettoHand);
        els.term.aankoop.innerText = "- " + fmt(aankoop);
        els.term.winst.innerText = fmt(werkelijkeWinst);
        els.term.frictie.innerText = fmt(totaleFrictie);

        // Terminal Kleur Winst
        if (werkelijkeWinst >= 0) {
            els.term.winst.style.color = "#00ff41";
            document.getElementById('row-winst').className = "term-row green";
        } else {
            els.term.winst.style.color = "#ff5555";
            document.getElementById('row-winst').className = "term-row red";
        }
    }

    // --- EVENT LISTENERS ---
    // Luister naar ALLES wat kan veranderen
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', updateCalculator);
        el.addEventListener('change', updateCalculator);
    });

    // Starten
    updateCalculator();
});
