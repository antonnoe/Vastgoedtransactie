/*
 * Vastgoedtransactie Analyse - rekenkern (InfoFrankrijk)
 *
 * Dit bestand bevat zowel de pure rekenfuncties (exporteerbaar, testbaar onder
 * Node via test.mjs) als de koppeling met de interface. De DOM-koppeling staat
 * onderaan achter een guard, zodat het bestand ook zonder browser laadbaar is.
 *
 * De departementale DMTO-tarieven staan NIET in dit bestand maar in dmto.json,
 * met bron en peildatum in het _meta-blok van dat bestand.
 */

/* =====================================================================
 * VERWIJZING NAAR HET ARTIKEL
 * =====================================================================
 *
 * !!! VERVANG DEZE WAARDE !!!
 * Dit is een placeholder. Alle signaleringen en hulpteksten linken hiernaar.
 * Zolang hier geen echte URL staat, is de canonical bewust weggelaten uit
 * index.html: een canonical naar de verkeerde pagina is schadelijker dan geen
 * canonical. Zie STATUS.md onder OPENSTAAND.
 */
export const ARTIKEL_URL = 'https://www.infofrankrijk.com/VERVANG-DOOR-ARTIKEL-URL';

/* =====================================================================
 * TARIEVEN EN BAREMA'S
 * ===================================================================== */

/* Emolumenten notaris, tarif reglemente, tableau 5 van bijlage 4-7 bij het
 * Code de commerce (art. A444-53). Degressieve schijven over de prijs. */
export const EMOLUMENTEN_TRANCHES = [
    { grens: 6500, pct: 0.03870 },
    { grens: 17000, pct: 0.01596 },
    { grens: 60000, pct: 0.01064 },
    { grens: Infinity, pct: 0.00799 }
];

/* BTW over de emolumenten van de notaris. */
export const TVA_PCT = 20.0;

/* Contribution de securite immobiliere, art. 879 CGI. */
export const CSI_PCT = 0.10;

/* Taxe de publicite fonciere bij een verkoop onder BTW (VEFA),
 * art. 1594 F quinquies CGI. */
export const TPF_VEFA_PCT = 0.715;

/* Forfaitair bedrag voor debours (kadaster, uittreksels, formaliteiten).
 * Geen wettelijk tarief maar een schatting; zie STATUS.md onder AANNAMES. */
export const DEBOURS_FORFAIT = 1200.0;

/* Plus-value: forfaits en tarieven. */
export const FORFAIT_AANKOOPKOSTEN_PCT = 7.5;   /* art. 150 VB II 3 CGI */
export const FORFAIT_VERBOUWING_PCT = 15.0;     /* art. 150 VB II 4 CGI, vanaf 5 jaar bezit */
export const TARIEF_IR_PCT = 19.0;              /* art. 200 B CGI */
export const TARIEF_PS_PCT = 17.2;              /* prelevements sociaux */
export const TARIEF_PS_DE_RUYTER_PCT = 7.5;     /* prelevement de solidarite */

/* Abattement voor bezitsduur, art. 150 VC CGI en art. L136-7 CSS. */
export const ABATTEMENT_IR_PER_JAAR = 6.0;      /* jaar 6 t/m 21 */
export const ABATTEMENT_IR_JAAR_22 = 4.0;       /* jaar 22, brengt totaal op 100 */
export const ABATTEMENT_PS_PER_JAAR = 1.65;     /* jaar 6 t/m 21 */
export const ABATTEMENT_PS_JAAR_22 = 1.60;      /* jaar 22 */
export const ABATTEMENT_PS_PER_JAAR_NA_22 = 9.0;/* jaar 23 t/m 30 */

/* Taxe sur les plus-values immobilieres elevees, art. 1609 nonies G CGI.
 * De heffing geldt boven 50.000 euro belastbare meerwaarde per verkoper en
 * niet voor terrains a batir. Elke tranche met een correctie is een
 * afvlakkingsformule: tarief maal PV, minus (bovengrens min PV) maal factor. */
export const SURTAXE_DREMPEL = 50000;
export const SURTAXE_BAREME = [
    { tot: 60000, pct: 0.02, correctie: 60000, factor: 1 / 20 },
    { tot: 100000, pct: 0.02, correctie: null, factor: 0 },
    { tot: 110000, pct: 0.03, correctie: 110000, factor: 1 / 10 },
    { tot: 150000, pct: 0.03, correctie: null, factor: 0 },
    { tot: 160000, pct: 0.04, correctie: 160000, factor: 15 / 100 },
    { tot: 200000, pct: 0.04, correctie: null, factor: 0 },
    { tot: 210000, pct: 0.05, correctie: 210000, factor: 20 / 100 },
    { tot: 250000, pct: 0.05, correctie: null, factor: 0 },
    { tot: 260000, pct: 0.06, correctie: 260000, factor: 25 / 100 },
    { tot: Infinity, pct: 0.06, correctie: null, factor: 0 }
];

/* =====================================================================
 * SIGNALERINGEN
 * =====================================================================
 *
 * Een signalering benoemt dat een situatie speelt en verwijst naar het
 * artikel. Zij bevat nooit een bedrag, een percentage of een termijn: die
 * gegevens staan niet primair vast en horen daarom niet in de tool.
 *
 * Het veld `tekst` is de lopende tekst en moet cijfervrij zijn; test.mjs
 * bewaakt dat. Het veld `artikelen` staat los, omdat een wetsartikel per
 * definitie cijfers bevat en geen bedrag, percentage of termijn is.
 */
export const SIGNALERINGEN = {
    nietIngezetene: {
        titel: 'U woont fiscaal buiten Frankrijk',
        tekst: 'De heffing over uw meerwaarde loopt dan niet via de route die deze tool berekent, maar via een afwijkend regime voor niet-inwoners. Er bestaat daarnaast een aparte vrijstelling voor onderdanen van de EU en de EER die eerder fiscaal inwoner van Frankrijk zijn geweest, en een aparte regeling voor de woning die uw hoofdverblijf was voordat u uit Frankrijk vertrok. In bepaalde gevallen moet u bovendien een erkend fiscaal vertegenwoordiger aanstellen. Deze tool rekent geen van deze regimes: het bedrag hieronder is dat van een inwoner en kan in uw geval hoger of lager uitvallen. Laat uw situatie voorleggen aan uw notaris.',
        artikelen: ['art. 244 bis A CGI', 'art. 150 U II 2° CGI']
    },
    gemeubileerdReeel: {
        titel: 'Het pand is gemeubileerd verhuurd geweest onder het reële stelsel',
        tekst: 'De afschrijvingen die u tijdens de verhuur heeft afgetrokken, worden bij de verkoop teruggenomen in de meerwaarde. De belastbare meerwaarde is daardoor hoger dan wat deze tool berekent, en de uitkomst hieronder is dus te laag. Hoeveel te laag hangt af van wat er in de jaren van verhuur is afgeschreven; dat weet uw boekhouder.',
        artikelen: []
    },
    overigeVrijstellingen: {
        titel: 'Deze tool kent niet alle vrijstellingen',
        tekst: 'Er bestaan meer vrijstellingen op de meerwaarde dan deze tool berekent, onder meer bij een lage verkoopprijs en voor gepensioneerden en houders van een invaliditeitskaart, in beide gevallen onder inkomens- en vermogensvoorwaarden. Ga na of een daarvan voor u geldt voordat u op dit bedrag afgaat.',
        artikelen: []
    },
    bewaarAankoopstukken: {
        titel: 'Bewaar de akte en de factuur van de makelaar',
        tekst: 'Deze berekening gebruikt voor uw aankoopkosten het wettelijke forfait. Bij een verkoop mag u in plaats daarvan uw werkelijke aankoopkosten opvoeren, en die vallen vaak hoger uit dan het forfait, wat uw belastbare meerwaarde verlaagt. Dat kan alleen met bewijsstukken. Zonder die stukken bent u aan het forfait gebonden.',
        artikelen: []
    }
};

/**
 * Welke signaleringen horen bij deze situatie? Alleen bij een verkoop en
 * alleen als er een belastbare meerwaarde is.
 */
export function bepaalSignaleringen(situatie) {
    const { rol, belastbareMeerwaarde, isNietIngezetene, isGemeubileerdReeel } = situatie;
    const verkoopt = rol === 'verkopen' || rol === 'beide';
    if (!verkoopt || !(belastbareMeerwaarde > 0)) return [];

    const uit = [];
    if (isNietIngezetene) uit.push(SIGNALERINGEN.nietIngezetene);
    if (isGemeubileerdReeel) uit.push(SIGNALERINGEN.gemeubileerdReeel);
    uit.push(SIGNALERINGEN.overigeVrijstellingen);
    uit.push(SIGNALERINGEN.bewaarAankoopstukken);
    return uit;
}

/* Postcodereeksen die niet met de eerste twee cijfers samenvallen: Corsica en
 * de DOM. Alle overige postcodes: de eerste twee cijfers. */
export const POSTCODE_RANGES = [
    { van: 20000, tot: 20199, dept: '2A' },
    { van: 20200, tot: 20999, dept: '2B' },
    { van: 97100, tot: 97199, dept: '971' },
    { van: 97200, tot: 97299, dept: '972' },
    { van: 97300, tot: 97399, dept: '973' },
    { van: 97400, tot: 97499, dept: '974' },
    { van: 97600, tot: 97699, dept: '976' }
];

/* =====================================================================
 * HULPFUNCTIES
 * ===================================================================== */

const rond2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const rond6 = (n) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

/* =====================================================================
 * PURE REKENFUNCTIES
 * ===================================================================== */

/**
 * Departementcode uit een Franse postcode. Geeft null bij een ongeldige
 * postcode. De teruggegeven code hoeft niet in dmto.json voor te komen; dat
 * moet de aanroeper zelf controleren.
 */
export function postcodeNaarDepartement(postcode) {
    const s = String(postcode == null ? '' : postcode).trim();
    if (!/^\d{5}$/.test(s)) return null;
    const n = parseInt(s, 10);
    for (const r of POSTCODE_RANGES) {
        if (n >= r.van && n <= r.tot) return r.dept;
    }
    return s.substring(0, 2);
}

/**
 * Zoekt het departement op in de dmto-tabel. Geeft null als het departement
 * niet in de DGFiP-tabel staat. Valt nooit terug op een standaardtarief.
 */
export function zoekDepartement(dmtoData, postcode) {
    const code = postcodeNaarDepartement(postcode);
    if (!code) return null;
    const rij = dmtoData && dmtoData.departementen ? dmtoData.departementen[code] : null;
    if (!rij) return null;
    return { code, naam: rij.naam, std: rij.std, primo: rij.primo };
}

/**
 * Departementaal tarief voor deze koper. Het primo-tarief wordt uitsluitend uit
 * het veld primo gelezen, nooit afgeleid door 0,5 punt van std af te trekken.
 */
export function departementaalTarief(departement, isPrimoAccedant) {
    if (!departement) return null;
    return isPrimoAccedant ? departement.primo : departement.std;
}

/**
 * Emolumenten van de notaris, exclusief btw.
 */
export function berekenEmolumenten(prijs) {
    if (!(prijs > 0)) return 0;
    let emolumenten = 0;
    let vorigeGrens = 0;
    for (const t of EMOLUMENTEN_TRANCHES) {
        if (prijs <= vorigeGrens) break;
        emolumenten += (Math.min(prijs, t.grens) - vorigeGrens) * t.pct;
        vorigeGrens = t.grens;
    }
    return rond2(emolumenten);
}

/**
 * Totale DMTO: departementaal tarief over de prijs, plus de gemeentelijke taxe,
 * plus frais d'assiette et de recouvrement over het departementale deel.
 * Afgerond op hele euro's, zoals de notaris doet.
 */
export function berekenDmto(prijs, departementaalPct, meta) {
    if (!(prijs > 0)) return 0;
    const communalePct = meta.taxe_communale_pct;
    const assietePct = meta.frais_assiette_pct_van_departementaal;
    const departementaal = prijs * (departementaalPct / 100);
    const communaal = prijs * (communalePct / 100);
    const assiette = departementaal * (assietePct / 100);
    return Math.round(departementaal + communaal + assiette);
}

/**
 * Notariskosten bij bestaande bouw (ancien): emolumenten, btw daarover, DMTO,
 * contribution de securite immobiliere en debours.
 */
export function berekenNotarisAncien(prijs, departementaalPct, meta) {
    if (!(prijs > 0)) return 0;
    const emolumenten = berekenEmolumenten(prijs);
    const tva = emolumenten * (TVA_PCT / 100);
    const dmto = berekenDmto(prijs, departementaalPct, meta);
    const csi = prijs * (CSI_PCT / 100);
    return rond2(emolumenten + tva + dmto + csi + DEBOURS_FORFAIT);
}

/**
 * Notariskosten bij nieuwbouw (VEFA): taxe de publicite fonciere in plaats van
 * DMTO, verder dezelfde componenten als bij bestaande bouw.
 */
export function berekenNotarisVefa(prijs) {
    if (!(prijs > 0)) return 0;
    const emolumenten = berekenEmolumenten(prijs);
    const tva = emolumenten * (TVA_PCT / 100);
    const tpf = prijs * (TPF_VEFA_PCT / 100);
    const csi = prijs * (CSI_PCT / 100);
    return rond2(emolumenten + tva + tpf + csi + DEBOURS_FORFAIT);
}

/**
 * Volle perioden van twaalf maanden van datum tot datum, zoals Frankrijk de
 * bezitsduur telt. Verwacht twee datums in ISO-notatie jjjj-mm-dd.
 */
export function volleJaren(datumAankoop, datumVerkoop) {
    const parse = (s) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s).trim());
        return m ? { j: +m[1], m: +m[2], d: +m[3] } : null;
    };
    const a = parse(datumAankoop);
    const v = parse(datumVerkoop);
    if (!a || !v) return 0;
    let jaren = v.j - a.j;
    if (v.m < a.m || (v.m === a.m && v.d < a.d)) jaren -= 1;
    return Math.max(0, jaren);
}

/**
 * Abattement voor bezitsduur in procenten, als [IR, sociale lasten].
 */
export function berekenAbattement(jaren) {
    if (jaren < 6) return [0, 0];

    let abatIr;
    if (jaren >= 22) abatIr = 100;
    else abatIr = (jaren - 5) * ABATTEMENT_IR_PER_JAAR;

    /* Jaar 6 t/m 21 is zestien jaar a 1,65 procent, jaar 22 telt 1,60 procent. */
    const basis22 = 16 * ABATTEMENT_PS_PER_JAAR + ABATTEMENT_PS_JAAR_22;
    let abatPs;
    if (jaren >= 30) abatPs = 100;
    else if (jaren >= 22) abatPs = basis22 + (jaren - 22) * ABATTEMENT_PS_PER_JAAR_NA_22;
    else abatPs = (jaren - 5) * ABATTEMENT_PS_PER_JAAR;

    return [rond6(Math.min(abatIr, 100)), rond6(Math.min(abatPs, 100))];
}

/**
 * Taxe sur les plus-values immobilieres elevees, art. 1609 nonies G CGI.
 * pvImposable is de belastbare meerwaarde na het abattement voor bezitsduur,
 * voor alle verkopers samen. De drempel van 50.000 euro geldt per verkoper, dus
 * de meerwaarde wordt eerst naar rato verdeeld.
 */
export function berekenSurtaxe(pvImposable, aantalVerkopers, isBouwgrond) {
    if (isBouwgrond) return 0;
    if (!(pvImposable > 0)) return 0;
    const n = Math.max(1, Math.floor(Number(aantalVerkopers) || 1));
    const deel = pvImposable / n;
    if (!(deel > SURTAXE_DREMPEL)) return 0;
    const tranche = SURTAXE_BAREME.find((t) => deel <= t.tot);
    let heffing = deel * tranche.pct;
    if (tranche.correctie !== null) {
        heffing -= (tranche.correctie - deel) * tranche.factor;
    }
    return Math.round(heffing) * n;
}

/* =====================================================================
 * INTERFACE
 * ===================================================================== */

if (typeof document !== 'undefined') {
    const fmt = (num) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
    const fmt2 = (num) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(num);

    let dmtoData = null;

    function toggleFiscaleOpties() {
        const isHoofd = document.getElementById('is_hoofdverblijf').checked;
        // Als het hoofdverblijf is, zijn plus-value opties minder relevant,
        // maar landmeter blijft wel kostenpost. We laten het staan, maar berekening past zich aan.
        // Voor de UX kunnen we De Ruyter disablen.
        document.getElementById('de_ruyter').disabled = isHoofd;
    }

    function calculate() {
        if (!dmtoData) return;

        // --- 1. Get Inputs ---
        const postcode = document.getElementById('postcode').value;
        const isNieuwbouw = document.querySelector('input[name="type_woning"]:checked').value === 'vefa';
        const isPrimo = document.getElementById('primo_accedant').checked;
        const makelaarOptie = document.getElementById('makelaar_optie').value;
        const makelaarPerc = parseFloat(document.getElementById('makelaar_perc').value) || 0;

        const verkoopprijs = parseFloat(document.getElementById('verkoopprijs').value) || 0;
        const aankoopprijs = parseFloat(document.getElementById('aankoopprijs').value) || 0;

        const datumAankoop = document.getElementById('datum_aankoop').value;
        const datumVerkoop = document.getElementById('datum_verkoop').value;
        const jarenBezit = volleJaren(datumAankoop, datumVerkoop);
        document.getElementById('jaren_bezit_label').innerText = `Jaren bezit: ${jarenBezit}`;

        const isHoofdverblijf = document.getElementById('is_hoofdverblijf').checked;
        const isNietIngezetene = document.getElementById('fiscale_woonplaats').value === 'buiten';
        const isGemeubileerdReeel = document.getElementById('gemeubileerd_reeel').checked;
        const isBouwgrond = document.getElementById('is_bouwgrond').checked;
        const aantalVerkopers = Math.max(1, parseInt(document.getElementById('aantal_verkopers').value, 10) || 1);
        const landmeter = parseFloat(document.getElementById('landmeter').value) || 0;
        const mainlevee = parseFloat(document.getElementById('mainlevee').value) || 0;
        const deRuyter = document.getElementById('de_ruyter').checked;

        // Toggle visibility inputs
        document.getElementById('makelaar_perc_wrapper').style.display = (makelaarOptie === 'geen') ? 'none' : 'block';
        document.getElementById('primo_wrapper').style.display = isNieuwbouw ? 'none' : 'block';

        // --- 2. Calculations ---

        // Makelaar & Notaris Basis
        let makelaarsKosten = 0.0;
        let prijsVoorNotaris = verkoopprijs;
        let nettoVerkoperBasis = verkoopprijs;

        if (makelaarOptie === 'geen') {
            makelaarsKosten = 0.0;
            prijsVoorNotaris = verkoopprijs;
            nettoVerkoperBasis = verkoopprijs;
        } else if (makelaarOptie === 'acquereur') {
            makelaarsKosten = verkoopprijs * (makelaarPerc / 100.0);
            prijsVoorNotaris = verkoopprijs - makelaarsKosten;
            nettoVerkoperBasis = verkoopprijs - makelaarsKosten;
        } else { // vendeur
            makelaarsKosten = verkoopprijs * (makelaarPerc / 100.0);
            prijsVoorNotaris = verkoopprijs;
            nettoVerkoperBasis = verkoopprijs - makelaarsKosten;
        }

        // Departement en notariskosten. Bij bestaande bouw is een bekend
        // departementaal tarief vereist; er wordt nooit teruggevallen op een
        // standaardtarief als de postcode niet in de DGFiP-tabel staat.
        const departement = zoekDepartement(dmtoData, postcode);
        const tarief = departementaalTarief(departement, isPrimo);
        let notarisKosten = null;
        let notarisMelding = '';

        if (isNieuwbouw) {
            notarisKosten = berekenNotarisVefa(prijsVoorNotaris);
        } else if (departement) {
            notarisKosten = berekenNotarisAncien(prijsVoorNotaris, tarief, dmtoData._meta);
        } else {
            notarisMelding = 'Het tarief voor dit gebied staat niet in de DGFiP-tabel. Notariskosten niet berekend.';
        }

        // Plus Value
        let plusValueTax = 0.0;
        let surtaxe = 0.0;
        let pvToelichting = "";
        let brutoMeerwaarde = 0.0;
        let belastbaarIr = 0.0;
        let abatIrPerc = 0.0;
        let abatPsPerc = 0.0;

        // Door de verkoper gedragen verkoopkosten verlagen de verkoopprijs voor
        // de meerwaardegrondslag, art. 150 VA III CGI met art. 41 duovicies H
        // van bijlage III.
        const verkoopkosten = landmeter + mainlevee;
        const prijsVoorMeerwaarde = nettoVerkoperBasis - verkoopkosten;

        if (isHoofdverblijf) {
            plusValueTax = 0.0;
            pvToelichting = "Vrijstelling: Hoofdverblijf";
        } else {
            const forfaitAankoop = aankoopprijs * (FORFAIT_AANKOOPKOSTEN_PCT / 100);
            const forfaitVerbouwing = (jarenBezit > 5) ? aankoopprijs * (FORFAIT_VERBOUWING_PCT / 100) : 0.0;
            const gecorrigeerdeAankoop = aankoopprijs + forfaitAankoop + forfaitVerbouwing;
            brutoMeerwaarde = prijsVoorMeerwaarde - gecorrigeerdeAankoop;

            if (brutoMeerwaarde <= 0) {
                plusValueTax = 0.0;
                pvToelichting = "Geen winst na forfaits";
            } else {
                const abat = berekenAbattement(jarenBezit);
                abatIrPerc = abat[0];
                abatPsPerc = abat[1];

                belastbaarIr = brutoMeerwaarde * (1.0 - (abatIrPerc / 100.0));
                const belastbaarPs = brutoMeerwaarde * (1.0 - (abatPsPerc / 100.0));

                const tariefIr = TARIEF_IR_PCT;
                const tariefPs = deRuyter ? TARIEF_PS_DE_RUYTER_PCT : TARIEF_PS_PCT;

                const taxIr = belastbaarIr * (tariefIr / 100.0);
                const taxPs = belastbaarPs * (tariefPs / 100.0);

                plusValueTax = taxIr + taxPs;
                surtaxe = berekenSurtaxe(belastbaarIr, aantalVerkopers, isBouwgrond);
                pvToelichting = `Winst na forfaits: € ${Math.round(brutoMeerwaarde)} <br> Aftrek: ${abatIrPerc.toFixed(1)}% (IR) / ${abatPsPerc.toFixed(1)}% (Soc)`;
            }
        }

        const totaalKostenVerkoper = makelaarsKosten + plusValueTax + surtaxe + landmeter + mainlevee;
        const nettoOpbrengst = verkoopprijs - totaalKostenVerkoper;
        const werkelijkeWinst = nettoOpbrengst - aankoopprijs;
        const frictiekosten = (notarisKosten === null ? 0 : notarisKosten) + totaalKostenVerkoper;

        // --- 3. Render Output ---

        // Table
        let notarisLabel = `Over € ${Math.round(prijsVoorNotaris)} (Grondslag)`;
        if (isNieuwbouw) notarisLabel += " - VEFA";
        else if (departement) notarisLabel += ` - ${departement.code} ${departement.naam}, ${tarief.toFixed(2)}% dep.${isPrimo ? ' (primo-accédant)' : ''}`;
        else notarisLabel = notarisMelding;

        let makelaarTekst = (makelaarOptie === 'geen') ? "-" : `${makelaarPerc}%`;
        const surtaxeToelichting = isBouwgrond
            ? 'Niet van toepassing: bouwgrond'
            : `Boven € ${SURTAXE_DREMPEL.toLocaleString('nl-NL')} per verkoper, ${aantalVerkopers} verkoper(s)`;

        let html = `
            <tr>
                <td colspan="3" style="font-weight:700; background-color:#f9f9f9;">KOSTEN KOPER</td>
            </tr>
            <tr>
                <td>Notariskosten</td>
                <td style="font-size:0.85rem; color:#666;">${notarisLabel}</td>
                <td class="amount">${notarisKosten === null ? '—' : fmt2(notarisKosten)}</td>
            </tr>
            <tr><td colspan="3" style="height:10px;"></td></tr>
            <tr>
                <td colspan="3" style="font-weight:700; background-color:#f9f9f9;">KOSTEN VERKOPER</td>
            </tr>
            <tr>
                <td>Makelaarscourtage</td>
                <td style="font-size:0.85rem; color:#666;">${makelaarTekst}</td>
                <td class="amount">${fmt2(makelaarsKosten)}</td>
            </tr>
            <tr>
                <td>Plus-value belasting</td>
                <td style="font-size:0.85rem; color:#666;">${pvToelichting}</td>
                <td class="amount">${fmt2(plusValueTax)}</td>
            </tr>
            <tr>
                <td>Taxe op hoge meerwaarden</td>
                <td style="font-size:0.85rem; color:#666;">${surtaxeToelichting}</td>
                <td class="amount">${fmt2(surtaxe)}</td>
            </tr>
            <tr>
                <td>Landmeter / Diagnostics</td>
                <td style="font-size:0.85rem; color:#666;"></td>
                <td class="amount">${fmt2(landmeter)}</td>
            </tr>
            <tr>
                <td>Mainlevée</td>
                <td style="font-size:0.85rem; color:#666;"></td>
                <td class="amount">${fmt2(mainlevee)}</td>
            </tr>
            <tr style="border-top:2px solid #ddd;">
                <td><strong>Totaal afhoudingen</strong></td>
                <td></td>
                <td class="amount"><strong>${fmt2(totaalKostenVerkoper)}</strong></td>
            </tr>
        `;
        document.getElementById('spec_table').innerHTML = html;

        // Peildatum van de DMTO-tarieven, zichtbaar onder de specificatie.
        // Uitgever, peildatum en bron-URL komen uit dmto.json, niet uit de code.
        document.getElementById('dmto_peildatum').innerHTML =
            `DMTO-tarieven volgens ${dmtoData._meta.uitgever}, peildatum ${dmtoData._meta.peildatum} ` +
            `(<a href="${dmtoData._meta.bron}" target="_blank" rel="noopener noreferrer">bron</a>)`;

        // Cards
        document.getElementById('res_netto').innerText = fmt(nettoOpbrengst);
        document.getElementById('res_winst').innerText = fmt(werkelijkeWinst);
        document.getElementById('res_frictie').innerText = notarisKosten === null ? '—' : fmt(frictiekosten);

        // Explanation Box
        let explanation = `<strong>Validatie van berekening:</strong><br>`;
        if (notarisMelding) {
            explanation += `⚠️ ${notarisMelding}<br>`;
        }
        if (isHoofdverblijf) {
            explanation += `✅ Object is Hoofdverblijf. Volledige vrijstelling Plus-Value.`;
        } else if (brutoMeerwaarde > 0) {
            explanation += `Jaren bezit: ${jarenBezit}. <br>`;
            explanation += `Aftrek Inkomstenbelasting: ${abatIrPerc.toFixed(1)}%. <br>`;
            explanation += `Aftrek Sociale Lasten: ${abatPsPerc.toFixed(1)}% (Tarief: ${deRuyter ? '7.5% - De Ruyter' : '17.2% - Standaard'}).`;
            if (surtaxe > 0) {
                explanation += `<br>Belastbare meerwaarde na abattement: € ${Math.round(belastbaarIr)}, verdeeld over ${aantalVerkopers} verkoper(s). Taxe art. 1609 nonies G CGI van toepassing.`;
            }
        } else {
            explanation += `Geen belastbare meerwaarde na aftrek forfaits.`;
        }
        document.getElementById('tax_explanation').innerHTML = explanation;

        // Signaleringen: situaties die de uitkomst kunnen veranderen maar die
        // deze tool bewust niet doorrekent.
        const signaleringen = bepaalSignaleringen({
            rol: huidigeRol(),
            belastbareMeerwaarde: belastbaarIr,
            isNietIngezetene,
            isGemeubileerdReeel
        });
        document.getElementById('signaleringen').innerHTML = signaleringen.map((s) => `
            <div class="signalering">
                <div class="signalering-titel">${s.titel}</div>
                <p>${s.tekst}</p>
                ${s.artikelen.length ? `<p class="signalering-artikelen">${s.artikelen.join(' · ')}</p>` : ''}
                <p><a data-artikel-link href="${ARTIKEL_URL}" target="_blank" rel="noopener noreferrer">Lees de uitleg in het artikel</a></p>
            </div>
        `).join('');
    }

    /* Rol van de gebruiker. Blok D vervangt dit door een echte keuze. */
    function huidigeRol() {
        const veld = document.querySelector('input[name="rol"]:checked');
        return veld ? veld.value : 'beide';
    }

    window.calculate = calculate;
    window.toggleFiscaleOpties = toggleFiscaleOpties;

    // Alle verwijzingen naar het artikel komen uit één constante.
    for (const a of document.querySelectorAll('a[data-artikel-link], #link_de_ruyter')) {
        a.href = ARTIKEL_URL;
    }

    fetch('dmto.json')
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((data) => {
            dmtoData = data;
            toggleFiscaleOpties();
            calculate();
        })
        .catch((err) => {
            document.getElementById('tax_explanation').innerHTML =
                `<strong>Fout:</strong> de tarieventabel dmto.json kon niet worden geladen (${err.message}). ` +
                `Er wordt niet gerekend met een terugvaltarief.`;
        });
}
