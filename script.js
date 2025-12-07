window.onload = function() {
    
    // DOM Elementen ophalen
    const btn = document.getElementById('btnBereken');
    
    // Configuratie
    const RATES = {
        notaris: 0.075, // 7.5% gem
        nieuwbouw: 0.03, // 3% gem
        makelaar: 0.05,
        forfait_aankoop: 0.075,
        forfait_werk: 0.15,
        tax: 0.362 // 19 + 17.2
    };

    // Helper: Euro formatter
    const money = (val) => val.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
    const getNum = (id) => parseFloat(document.getElementById(id).value) || 0;

    // Rol switch logica
    const roles = document.getElementsByName('role');
    const inpVerkoop = document.getElementById('verkoopprijs');
    const inpAankoop = document.getElementById('aankoopprijs');

    function updateRole() {
        const r = document.querySelector('input[name="role"]:checked').value;
        // Reset
        inpVerkoop.disabled = false;
        inpAankoop.disabled = false;
        
        if(r === 'koper') {
            // Koper vult normaal geen historische aankoop in, maar we laten het open voor scenario
        } else if (r === 'verkoper') {
            // Verkoper mag alles zien
        }
    }
    
    // Event listeners voor rol
    roles.forEach(r => r.addEventListener('change', updateRole));

    // HOOFDBEREKENING
    btn.addEventListener('click', function() {
        
        // 1. Waarden ophalen
        const verkoop = getNum('verkoopprijs');
        const aankoop = getNum('aankoopprijs');
        const dept = getNum('dept');
        const jaren = getNum('jaren');
        const type = document.getElementById('typeWoning').value;
        const isRP = document.getElementById('isRP').value === 'ja';
        const makelaarWie = document.querySelector('input[name="makelaarWie"]:checked').value;

        let koperK = 0;
        let verkoperK = 0;
        let koperHTML = "";
        let verkoperHTML = "";

        // --- KOPER KOSTEN ---
        
        // Notaris
        let notarisPct = (type === 'nieuw') ? RATES.nieuwbouw : RATES.notaris;
        // Dept correctie (simpel)
        if([36,56,976].includes(dept)) notarisPct -= 0.007; // Iets lager
        if([75,13,31].includes(dept)) notarisPct += 0.005; // Iets hoger
        
        const notarisBedrag = verkoop * notarisPct;
        koperK += notarisBedrag;
        koperHTML += `<div class="res-row"><span>Notariskosten (schatting)</span> <span>${money(notarisBedrag)}</span></div>`;

        // Makelaar (als koper betaalt)
        if(makelaarWie === 'koper') {
            const mk = verkoop * RATES.makelaar;
            koperK += mk;
            koperHTML += `<div class="res-row"><span>Makelaarscourtage</span> <span>${money(mk)}</span></div>`;
        }

        // Caution
        if(document.getElementById('opt_caution').checked) {
            koperK += 1200;
            koperHTML += `<div class="res-row"><span>Hypotheekgarantie</span> <span>${money(1200)}</span></div>`;
        }

        // --- VERKOPER KOSTEN ---

        // Makelaar (als verkoper betaalt)
        if(makelaarWie === 'verkoper') {
            const mk = verkoop * RATES.makelaar;
            verkoperK += mk;
            verkoperHTML += `<div class="res-row"><span>Makelaarscourtage</span> <span>${money(mk)}</span></div>`;
        }

        // Plus-Value (Optie B Forfaitair)
        let pv = 0;
        if(!isRP && verkoop > aankoop) {
            // Aankoop + 7.5%
            const basis = aankoop * (1 + RATES.forfait_aankoop);
            // Werken + 15% (als > 5 jaar)
            const werk = (jaren >= 5) ? (aankoop * RATES.forfait_werk) : 0;
            
            const totaleAankoop = basis + werk;
            const winst = verkoop - totaleAankoop;

            if(winst > 0) {
                pv = winst * RATES.tax;
            }
        }

        if(isRP) {
            verkoperHTML += `<div class="res-row"><span>Plus-Value</span> <span>Vrijgesteld</span></div>`;
        } else {
            verkoperK += pv;
            verkoperHTML += `<div class="res-row"><span>Plus-Value (Forfait)</span> <span>${money(pv)}</span></div>`;
        }

        // Opties Verkoper
        if(document.getElementById('opt_mainlevee').checked) {
            verkoperK += 700;
            verkoperHTML += `<div class="res-row"><span>Mainlevée</span> <span>${money(700)}</span></div>`;
        }
        if(document.getElementById('opt_spanc').checked) {
            verkoperK += 150;
            verkoperHTML += `<div class="res-row"><span>SPANC</span> <span>${money(150)}</span></div>`;
        }
        if(document.getElementById('opt_geo').checked) {
            verkoperK += 1500;
            verkoperHTML += `<div class="res-row"><span>Géomètre</span> <span>${money(1500)}</span></div>`;
        }

        // --- OUTPUT NAAR SCHERM ---
        document.getElementById('out-koper').innerHTML = koperHTML;
        document.getElementById('out-verkoper').innerHTML = verkoperHTML;
        document.getElementById('tot-koper').innerText = money(koperK);
        document.getElementById('tot-verkoper').innerText = money(verkoperK);

        // Matrix vullen
        const netto = verkoop - verkoperK;
        const winstEcht = netto - aankoop;
        const frictie = koperK + verkoperK;

        document.getElementById('t-verkoop').innerText = money(verkoop);
        document.getElementById('t-kosten').innerText = "- " + money(verkoperK);
        document.getElementById('t-netto').innerText = money(netto);
        document.getElementById('t-aankoop').innerText = "- " + money(aankoop);
        document.getElementById('t-winst').innerText = money(winstEcht);
        document.getElementById('t-frictie').innerText = money(frictie);

        // Toon resultaten
        document.getElementById('resultaten').style.display = 'block';
    });

};
