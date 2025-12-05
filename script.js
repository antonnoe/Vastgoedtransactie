/* ------------------------------------------------------
   SCRIPT.JS – v4.1
--------------------------------------------------------- */

/* ------------------------------
   INFOBOX TOGGLES
------------------------------ */
document.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;

        if (target.style.display === "block") {
            target.style.display = "none";
        } else {
            target.style.display = "block";
        }
    });
});

/* ------------------------------
   FAQ TOGGLES
------------------------------ */
document.querySelectorAll(".faq-question").forEach(q => {
    q.addEventListener("click", () => {
        const ans = q.nextElementSibling;

        if (ans.style.display === "block") {
            ans.style.display = "none";
        } else {
            ans.style.display = "block";
        }
    });
});

/* ------------------------------
   MAKELAAR-BUTTONS
------------------------------ */
let makelaarRol = "geen";

document.querySelectorAll(".mk-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mk-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        makelaarRol = btn.dataset.value; // "verkoper" | "koper" | "geen"
    });
});

/* ------------------------------
   MUTATIONSTARIEF OP BASIS VAN DEPARTEMENT
------------------------------ */
function mutationTarief(dept) {

    dept = Number(dept);

    // LAGE TARIEF DEPARTEMENTEN
    const laagTarief = [36, 56, 976]; // Indre, Morbihan, Mayotte
    if (laagTarief.includes(dept)) return 0.0509;

    // HOGE TARIEF DEPARTEMENTEN
    const hoogTarief = [75, 13, 31, 35]; // Paris, Bouches-du-Rhône, Haute-Garonne, Ille-et-Vilaine
    if (hoogTarief.includes(dept)) return 0.0631;

    // OVERIG
    return 0.0581;
}

/* ------------------------------
   NOTARISKOSTEN – vereenvoudigd model
   (Indicatie, niet exact conform barème)
------------------------------ */
function berekenNotariskosten(prijs, isNieuwbouw) {

    if (isNieuwbouw) {
        // Nieuwbouw: 3–4%
        return prijs * 0.035;
    }

    // Bestaand: 7–8% → we nemen 7,5% indicatief
    return prijs * 0.075;
}

/* ------------------------------
   PLUS-VALUE FORFAITAIR
------------------------------ */
function berekenPlusValue(aankoop, verkoop, jaren, isRP) {

    if (isRP === "ja") return 0;        // RESIDENCE PRINCIPALE → vrijstelling
    if (verkoop <= aankoop) return 0;   // Geen winst → geen belasting

    let winst = verkoop - aankoop;

    // STAFFEL VOOR VRIJSTELLING
    // Fictief forfaitair – jouw eerdere instructie
    let belastingPercentage = 0.362; // 19% + 17.2%

    // Vermindering naarmate jaren bezit
    if (jaren >= 6 && jaren < 22) winst *= 0.7;
    if (jaren >= 22 && jaren < 30) winst *= 0.4;
    if (jaren >= 30) return 0;

    return winst * belastingPercentage;
}

/* ------------------------------
   FACULTATIEVE KOSTEN MODEL
------------------------------ */
function facultatieveKosten(makelaarRol, prijs, checks) {

    const result = {
        koper: 0,
        verkoper: 0,
        detailsKoper: [],
        detailsVerkoper: []
    };

    /* MAKELAARSKOSTEN */
    if (makelaarRol !== "geen") {
        const mk = prijs * 0.05; // 5% indicatief middenpunt
        if (makelaarRol === "koper") {
            result.koper += mk;
            result.detailsKoper.push(`Makelaarskosten: €${mk.toLocaleString()}`);
        } else {
            result.verkoper += mk;
            result.detailsVerkoper.push(`Makelaarskosten: €${mk.toLocaleString()}`);
        }
    }

    /* CAUTION – koper */
    if (checks.caution) {
        result.koper += 1200; // indicatief
        result.detailsKoper.push(`Caution bancaire: €1.200`);
    }

    /* MAINLEVEE – verkoper */
    if (checks.mainlevee) {
        result.verkoper += 700;
        result.detailsVerkoper.push(`Mainlevée d’hypothèque: €700`);
    }

    /* SPANC – verkoper */
    if (checks.spanc) {
        result.verkover += 0; // Actually cost only if repairs needed — but listed as facultative
        result.detailsVerkoper.push(`SPANC-inspectie: €0 (inspectie verplicht; eventuele werken apart)`);
    }

    /* GEOMETRE – verkoper */
    if (checks.geometre) {
        result.verkoper += 1200;
        result.detailsVerkoper.push(`Géomètre: €1.200`);
    }

    return result;
}

/* ------------------------------
   ROL LOCKING
------------------------------ */
function rolLock(role) {

    const aankoop = document.getElementById("aankoopprijs");
    const verkoop = document.getElementById("verkoopprijs");

    if (role === "koper") {
        aankoop.disabled = true;
        verkoop.disabled = false;
    }
    if (role === "verkoper") {
        aankoop.disabled = false;
        verkoop.disabled = true;
    }
    if (role === "notaris") {
        aankoop.disabled = false;
        verkoop.disabled = false;
    }
}

document.querySelectorAll("input[name='role']").forEach(r => {
    r.addEventListener("change", () => rolLock(r.value));
});

/* INIT */
rolLock("koper");

/* ------------------------------
   UPDATE NOTARIS INDICATIE
------------------------------ */
function updateIndicatie() {
    const prijs = Number(document.getElementById("aankoopprijs").value);
    const type = document.getElementById("woningtype").value;

    const indicatie = berekenNotariskosten(prijs, type === "neuf");
    document.getElementById("notarisIndicatie").innerText = indicatie.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
}

document.getElementById("aankoopprijs").addEventListener("input", updateIndicatie);

/* ------------------------------
   BEREKENING HOOFDFUNCTIE
------------------------------ */
document.getElementById("calculateBtn").addEventListener("click", () => {

    const role = document.querySelector("input[name='role']:checked").value;

    const aankoop = Number(document.getElementById("aankoopprijs").value);
    const verkoop = Number(document.getElementById("verkoopprijs").value);
    const dept = Number(document.getElementById("departement").value);
    const type = document.getElementById("woningtype").value;
    const isRP = document.getElementById("isRP").value;
    const jaren = Number(document.getElementById("jarenBezit").value);

    const mutRate = mutationTarief(dept);
    document.getElementById("mutationTarief").innerText = (mutRate * 100).toFixed(3) + "%";

    /* Notariskosten koper */
    const notaris = berekenNotariskosten(verkoop, type === "neuf");

    /* Mutationstarief koper */
    const droits = verkoop * mutRate;

    /* Facultatieve kosten */
    const facult = facultatieveKosten(makelaarRol, verkoop, {
        caution: document.getElementById("caution").checked,
        mainlevee: document.getElementById("mainlevee").checked,
        spanc: document.getElementById("spanc").checked,
        geometre: document.getElementById("geometre").checked
    });

    /* Plus-value verkoper */
    const plusValue = berekenPlusValue(aankoop, verkoop, jaren, isRP);

    /* -----------------------------------------
       TOTAAL PER PARTIJ
    ------------------------------------------ */
    let koperTotaal = notaris + droits + facult.koper;
    let verkoperTotaal = facult.verkoper + plusValue;

    /* -----------------------------------------
       WEERGAVE
    ------------------------------------------ */
    const out = [];

    out.push(`<h3>Koper betaalt</h3>`);
    out.push(`<ul>
        <li>Notariskosten: €${notaris.toLocaleString()}</li>
        <li>Droits de mutation: €${droits.toLocaleString()}</li>
        ${facult.detailsKoper.map(x => `<li>${x}</li>`).join("")}
        <li><strong>Totaal koper: €${koperTotaal.toLocaleString()}</strong></li>
    </ul>`);

    out.push(`<h3>Verkoper betaalt</h3>`);
    out.push(`<ul>
        ${facult.detailsVerkoper.map(x => `<li>${x}</li>`).join("")}
        <li>Plus-value (indien van toepassing): €${plusValue.toLocaleString()}</li>
        <li><strong>Totaal verkoper: €${verkoperTotaal.toLocaleString()}</strong></li>
    </ul>`);

    out.push(`<h3>Cumulatieve kosten</h3>`);
    out.push(`<p><strong>€${(koperTotaal + verkoperTotaal).toLocaleString()}</strong></p>`);

    out.push(`<h3>Adviezen & mogelijkheden om te besparen</h3>`);
    out.push(`<ul>
        <li>Overweeg verkoop zonder makelaar (notariskantoor begeleidt transactie).</li>
        <li>Voor verkopers: maak de woning tijdig uw résidence principale om plus-value te vermijden (zie wettelijke voorwaarden).</li>
        <li>Voor kopers: een caution bancaire is niet altijd haalbaar voor niet-residenten.</li>
        <li>Minimaliseer facultatieve kosten door vooraf dossier compleet te maken (SPANC, géomètre).</li>
    </ul>`);

    document.getElementById("result-output").innerHTML = out.join("");
    document.getElementById("resultaten").style.display = "block";
});

/* INITIATE NOTARIS INDICATIE */
updateIndicatie();
