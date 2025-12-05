/* -------------------------
   INFOBOX
--------------------------*/
document.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const box = document.getElementById(btn.dataset.target);
        if (!box) return;
        box.style.display = box.style.display === "block" ? "none" : "block";
    });
});

/* -------------------------
   MAKELAAR KNOP
--------------------------*/
let makelaarRol = "verkoper";

document.querySelectorAll(".mk-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mk-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        makelaarRol = btn.dataset.value;
    });
});

/* -------------------------
   MUTATIONSTARIEF
--------------------------*/
function mutationTarief(dept) {
    dept = Number(dept);
    if ([36,56,976].includes(dept)) return 0.0509;
    if ([75,13,31,35].includes(dept)) return 0.0631;
    return 0.0581;
}

/* -------------------------
   NOTARISKOSTEN indicatie
--------------------------*/
function berekenNotariskosten(prijs, nieuwbouw) {
    return nieuwbouw ? prijs * 0.035 : prijs * 0.075;
}

function updateIndicatie() {
    const prijs = Number(document.getElementById("aankoopprijs").value);
    const type = document.getElementById("woningtype").value;
    const val = berekenNotariskosten(prijs, type === "neuf");
    document.getElementById("notarisIndicatie").innerText = val.toLocaleString("nl-NL",{style:"currency",currency:"EUR"});
}

document.getElementById("aankoopprijs").addEventListener("input", updateIndicatie);
updateIndicatie();

/* -------------------------
   ROL LOCK
--------------------------*/
function rolLock(role) {
    const aankoop = document.getElementById("aankoopprijs");
    const verkoop = document.getElementById("verkoopprijs");

    if (role === "koper") {
        aankoop.disabled = true;
        verkoop.disabled = false;
    } 
    else if (role === "verkoper") {
        aankoop.disabled = false;
        verkoop.disabled = false;
    } 
    else {
        aankoop.disabled = false;
        verkoop.disabled = false;
    }
}

document.querySelectorAll("input[name='role']").forEach(r => {
    r.addEventListener("change", () => rolLock(r.value));
});

/* -------------------------
   PLUS VALUE – forfaitair B
   aankoopprijs * 1.075
   + 15% forfait werken
   belasting = 36.2%
--------------------------*/
function berekenPlusValue(aankoop, verkoop) {
    if (verkoop <= aankoop) return 0;

    const basis = aankoop * 1.075;        // +7.5% kosten
    const metWerken = basis * 1.15;       // +15% forfait werken

    const winst = verkoop - metWerken;
    if (winst <= 0) return 0;

    return winst * 0.362; // 36.2%
}

/* -------------------------
   FACULTATIEVE KOSTEN
--------------------------*/
function facultatieveKosten(rol, prijs, chk) {

    const res = {
        koper: 0,
        verkoper: 0,
        detailsKoper: [],
        detailsVerkoper: []
    };

    /* Makelaar */
    if (rol === "koper") {
        const mk = prijs * 0.05;
        res.koper += mk;
        res.detailsKoper.push(`Makelaarskosten: €${mk.toLocaleString()}`);
    }
    else if (rol === "verkoper") {
        const mk = prijs * 0.05;
        res.verkoper += mk;
        res.detailsVerkoper.push(`Makelaarskosten: €${mk.toLocaleString()}`);
    }

    /* Facultatief */
    if (chk.caution) {
        res.koper += 1200;
        res.detailsKoper.push("Caution bancaire: €1.200");
    }

    if (chk.main) {
        res.verkoper += 700;
        res.detailsVerkoper.push("Mainlevée: €700");
    }

    if (chk.spanc) {
        res.detailsVerkoper.push("SPANC-inspectie (kosten variabel)");
    }

    if (chk.geo) {
        res.verkoper += 1200;
        res.detailsVerkoper.push("Géomètre: €1.200");
    }

    return res;
}

/* -------------------------
   CALCULATE
--------------------------*/
document.getElementById("calculateBtn").addEventListener("click", () => {

    const role = document.querySelector("input[name='role']:checked").value;

    const aankoop = Number(document.getElementById("aankoopprijs").value);
    const verkoop = Number(document.getElementById("verkoopprijs").value);
    const dept = Number(document.getElementById("departement").value);
    const type = document.getElementById("woningtype").value;

    const mut = mutationTarief(dept);
    document.getElementById("mutationTarief").innerText = (mut*100).toFixed(3)+"%";

    const notaris = berekenNotariskosten(verkoop, type==="neuf");
    const droits = verkoop * mut;

    const facult = facultatieveKosten(makelaarRol, verkoop, {
        caution: document.getElementById("caution").checked,
        main: document.getElementById("mainlevee").checked,
        spanc: document.getElementById("spanc").checked,
        geo: document.getElementById("geometre").checked
    });

    const pv = berekenPlusValue(aankoop, verkoop);

    const koperT = notaris + droits + facult.koper;
    const verkT = facult.verkoper + pv;
    const tot = koperT + verkT;

    let html = "";

    html += `<h3>Koper betaalt</h3><ul>`;
    html += `<li>Notariskosten: €${notaris.toLocaleString()}</li>`;
    html += `<li>Droits de mutation: €${droits.toLocaleString()}</li>`;
    facult.detailsKoper.forEach(x => html += `<li>${x}</li>`);
    html += `<li><strong>Totaal koper: €${koperT.toLocaleString()}</strong></li></ul>`;

    html += `<h3>Verkoper betaalt</h3><ul>`;
    facult.detailsVerkoper.forEach(x => html += `<li>${x}</li>`);
    html += `<li>Plus-value forfaitair: €${pv.toLocaleString()}</li>`;
    html += `<li><strong>Totaal verkoper: €${verkT.toLocaleString()}</strong></li></ul>`;

    html += `<h3>Cumulatieve kosten</h3>`;
    html += `<p><strong>€${tot.toLocaleString()}</strong></p>`;

    html += `<h3>Adviezen</h3>
    <ul>
        <li>Overweeg verkoop zonder makelaar → lagere vraagprijs, minder frictie.</li>
        <li>Voor kopers: caution bancaire niet altijd haalbaar voor niet-residenten.</li>
        <li>Voor verkopers: mainlevée en géomètre vroeg voorbereiden.</li>
        <li>Gebruik de volledige Infofrankrijk Plus-Value simulator voor detailberekening.</li>
    </ul>`;

    document.getElementById("result-output").innerHTML = html;
    document.getElementById("resultaten").style.display = "block";
});
