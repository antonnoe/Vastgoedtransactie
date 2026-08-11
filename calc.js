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
 * Geen wettelijk tarief maar een schatting; zie STATUS.md onder AANNAMES.
 * Wordt in de interface zichtbaar als schatting gelabeld. */
export const DEBOURS_FORFAIT = 1200.0;

/* Korting die de notaris mag geven op zijn emolumenten: ten hoogste
 * REMISE_MAX_PCT over het deel van de grondslag vanaf REMISE_DREMPEL.
 * Hij is daartoe niet verplicht. Bron: economie.gouv.fr, frais de notaire. */
export const REMISE_DREMPEL = 100000;
export const REMISE_MAX_PCT = 20;

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
 * Optionele korting van de notaris op zijn emolumenten. Wettelijk maximum:
 * REMISE_MAX_PCT over het deel van de grondslag vanaf REMISE_DREMPEL. De
 * notaris is niet verplicht die korting te geven; standaard staat hij uit.
 * Bron: economie.gouv.fr, frais de notaire.
 */
export function berekenRemise(prijs, remisePct) {
    const pct = Math.min(Math.max(Number(remisePct) || 0, 0), REMISE_MAX_PCT);
    if (pct === 0 || !(prijs > REMISE_DREMPEL)) return 0;
    // Emolumenten die aan het deel boven de drempel zijn toe te rekenen.
    const emolumentenBovenDrempel = berekenEmolumenten(prijs) - berekenEmolumenten(REMISE_DREMPEL);
    return rond2(emolumentenBovenDrempel * (pct / 100));
}

/**
 * Notariskosten bij bestaande bouw (ancien): emolumenten na eventuele korting,
 * btw daarover, DMTO, contribution de securite immobiliere en debours.
 */
export function berekenNotarisAncien(prijs, departementaalPct, meta, remisePct) {
    if (!(prijs > 0)) return 0;
    const emolumenten = berekenEmolumenten(prijs) - berekenRemise(prijs, remisePct);
    const tva = emolumenten * (TVA_PCT / 100);
    const dmto = berekenDmto(prijs, departementaalPct, meta);
    const csi = prijs * (CSI_PCT / 100);
    return rond2(emolumenten + tva + dmto + csi + DEBOURS_FORFAIT);
}

/**
 * Notariskosten bij nieuwbouw (VEFA): taxe de publicite fonciere in plaats van
 * DMTO, verder dezelfde componenten als bij bestaande bouw.
 */
export function berekenNotarisVefa(prijs, remisePct) {
    if (!(prijs > 0)) return 0;
    const emolumenten = berekenEmolumenten(prijs) - berekenRemise(prijs, remisePct);
    const tva = emolumenten * (TVA_PCT / 100);
    const tpf = prijs * (TPF_VEFA_PCT / 100);
    const csi = prijs * (CSI_PCT / 100);
    return rond2(emolumenten + tva + tpf + csi + DEBOURS_FORFAIT);
}

/**
 * Kiest tussen het forfait en het door de gebruiker opgegeven werkelijke
 * bedrag, en meldt welke van de twee gunstiger is. Gunstiger betekent hier: de
 * hoogste aftrek, want die verlaagt de belastbare meerwaarde.
 */
export function kiesKostenpost(forfait, modus, eigenBedrag) {
    const eigen = Math.max(0, Number(eigenBedrag) || 0);
    const werkelijkGekozen = modus === 'werkelijk';
    return {
        forfait: rond2(forfait),
        eigen: rond2(eigen),
        bedrag: rond2(werkelijkGekozen ? eigen : forfait),
        gunstigste: eigen > forfait ? 'werkelijk' : 'forfait',
        verschil: rond2(Math.abs(eigen - forfait))
    };
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
 * HET MODEL
 * =====================================================================
 *
 * berekenScenario is puur: alle invoer gaat erin, alle uitkomsten komen
 * eruit, en er wordt niets uit de DOM gelezen. Daardoor kan de interface hem
 * met gewijzigde invoer opnieuw draaien voor de gevoeligheden, en kan test.mjs
 * hem rechtstreeks aanroepen.
 */
export function berekenScenario(inv, dmtoData) {
    const meta = dmtoData._meta;
    const verkoopprijs = Math.max(0, Number(inv.verkoopprijs) || 0);
    const aankoopprijs = Math.max(0, Number(inv.aankoopprijs) || 0);
    const makelaarPerc = Math.max(0, Number(inv.makelaarPerc) || 0);

    /* De drie verkoopkostenposten mogen onbekend zijn. Onbekend telt als nul in
     * de berekening, maar wordt apart teruggegeven zodat de interface kan
     * melden dat de uitkomst op dat punt onvolledig is. Er wordt geen
     * bandbreedte of schatting voor in de plaats gezet. */
    const isOnbekend = (v) => v === null || v === undefined || v === '';
    const alsBedrag = (v) => (isOnbekend(v) ? 0 : Math.max(0, Number(v) || 0));
    const onbekendePosten = [
        ['landmeter', inv.landmeter],
        ['diagnostics', inv.diagnostics],
        ['mainlevée', inv.mainlevee]
    ].filter(([, v]) => isOnbekend(v)).map(([naam]) => naam);
    const landmeter = alsBedrag(inv.landmeter);
    const diagnostics = alsBedrag(inv.diagnostics);
    const mainlevee = alsBedrag(inv.mainlevee);

    // Makelaar en grondslagen
    let makelaarsKosten = 0;
    let prijsVoorNotaris = verkoopprijs;
    let nettoVerkoperBasis = verkoopprijs;
    if (inv.makelaarOptie === 'acquereur') {
        makelaarsKosten = verkoopprijs * (makelaarPerc / 100);
        prijsVoorNotaris = verkoopprijs - makelaarsKosten;
        nettoVerkoperBasis = verkoopprijs - makelaarsKosten;
    } else if (inv.makelaarOptie === 'vendeur') {
        makelaarsKosten = verkoopprijs * (makelaarPerc / 100);
        nettoVerkoperBasis = verkoopprijs - makelaarsKosten;
    }

    // Notariskosten. Bij bestaande bouw is een bekend departementaal tarief
    // vereist; er wordt nooit teruggevallen op een standaardtarief.
    const departement = zoekDepartement(dmtoData, inv.postcode);
    const tarief = departementaalTarief(departement, inv.isPrimo);
    const remise = berekenRemise(prijsVoorNotaris, inv.remisePct);
    let notarisKosten = null;
    if (inv.isNieuwbouw) {
        notarisKosten = berekenNotarisVefa(prijsVoorNotaris, inv.remisePct);
    } else if (departement) {
        notarisKosten = berekenNotarisAncien(prijsVoorNotaris, tarief, meta, inv.remisePct);
    }

    const jarenBezit = volleJaren(inv.datumAankoop, inv.datumVerkoop);

    // Plus-value
    const verkoopkosten = landmeter + diagnostics + mainlevee;
    const prijsVoorMeerwaarde = nettoVerkoperBasis - verkoopkosten;
    const aankoopkosten = kiesKostenpost(
        aankoopprijs * (FORFAIT_AANKOOPKOSTEN_PCT / 100),
        inv.aankoopkostenModus, inv.aankoopkostenEigen);
    const werkzaamheden = kiesKostenpost(
        jarenBezit > 5 ? aankoopprijs * (FORFAIT_VERBOUWING_PCT / 100) : 0,
        inv.werkzaamhedenModus, inv.werkzaamhedenEigen);

    let brutoMeerwaarde = 0;
    let abatIr = 0;
    let abatPs = 0;
    let belastbaarIr = 0;
    let plusValueTax = 0;
    let surtaxe = 0;
    let pvReden = '';

    if (inv.isHoofdverblijf) {
        pvReden = 'vrijstelling hoofdverblijf';
    } else {
        const gecorrigeerdeAankoop = aankoopprijs + aankoopkosten.bedrag + werkzaamheden.bedrag;
        brutoMeerwaarde = prijsVoorMeerwaarde - gecorrigeerdeAankoop;
        if (brutoMeerwaarde <= 0) {
            brutoMeerwaarde = Math.min(0, brutoMeerwaarde);
            pvReden = 'geen winst na aftrek';
        } else {
            [abatIr, abatPs] = berekenAbattement(jarenBezit);
            belastbaarIr = brutoMeerwaarde * (1 - abatIr / 100);
            const belastbaarPs = brutoMeerwaarde * (1 - abatPs / 100);
            const tariefPs = inv.deRuyter ? TARIEF_PS_DE_RUYTER_PCT : TARIEF_PS_PCT;
            plusValueTax = belastbaarIr * (TARIEF_IR_PCT / 100) + belastbaarPs * (tariefPs / 100);
            surtaxe = berekenSurtaxe(belastbaarIr, inv.aantalVerkopers, inv.isBouwgrond);
        }
    }

    const totaalKostenVerkoper = makelaarsKosten + plusValueTax + surtaxe + verkoopkosten;
    const nettoOpbrengst = verkoopprijs - totaalKostenVerkoper;
    const totaalKostenKoper = notarisKosten === null
        ? null
        : rond2(prijsVoorNotaris + notarisKosten + (inv.makelaarOptie === 'acquereur' ? makelaarsKosten : 0));

    return {
        departement, tarief, notarisKosten,
        emolumenten: berekenEmolumenten(prijsVoorNotaris), remise,
        makelaarsKosten, prijsVoorNotaris, nettoVerkoperBasis,
        jarenBezit, aankoopkosten, werkzaamheden,
        brutoMeerwaarde, abatIr, abatPs, belastbaarIr,
        plusValueTax, surtaxe, pvReden,
        landmeter, diagnostics, mainlevee, verkoopkosten, onbekendePosten,
        totaalKostenVerkoper, nettoOpbrengst,
        werkelijkeWinst: nettoOpbrengst - aankoopprijs,
        totaalKostenKoper,
        frictiekosten: notarisKosten === null ? null : notarisKosten + totaalKostenVerkoper
    };
}

/* =====================================================================
 * INVOER: STANDAARDWAARDEN, VALIDATIE EN URL-CODERING
 * ===================================================================== */

/* De drie verkoopkostenposten staan bewust op null: onbekend, niet nul. */
export const STANDAARD_INVOER = {
    rol: 'beide',
    postcode: '58000',
    isNieuwbouw: false,
    isPrimo: false,
    remisePct: 0,
    makelaarOptie: 'vendeur',
    makelaarPerc: 6,
    verkoopprijs: 400000,
    aankoopprijs: 200000,
    datumAankoop: '2015-01-01',
    datumVerkoop: '2025-01-01',
    isHoofdverblijf: false,
    isNietIngezetene: false,
    isGemeubileerdReeel: false,
    isBouwgrond: false,
    aantalVerkopers: 1,
    aankoopkostenModus: 'forfait',
    aankoopkostenEigen: 0,
    werkzaamhedenModus: 'forfait',
    werkzaamhedenEigen: 0,
    landmeter: null,
    diagnostics: null,
    mainlevee: null,
    deRuyter: false
};

/* Afkortingen voor de URL, zodat een gedeeld scenario leesbaar blijft. */
export const URL_VELDEN = [
    ['rol', 'rol', 'tekst'],
    ['postcode', 'pc', 'tekst'],
    ['isNieuwbouw', 'nb', 'vinkje'],
    ['isPrimo', 'pa', 'vinkje'],
    ['remisePct', 'rm', 'getal'],
    ['makelaarOptie', 'mo', 'tekst'],
    ['makelaarPerc', 'mp', 'getal'],
    ['verkoopprijs', 'vp', 'getal'],
    ['aankoopprijs', 'ap', 'getal'],
    ['datumAankoop', 'da', 'tekst'],
    ['datumVerkoop', 'dv', 'tekst'],
    ['isHoofdverblijf', 'hv', 'vinkje'],
    ['isNietIngezetene', 'ni', 'vinkje'],
    ['isGemeubileerdReeel', 'gr', 'vinkje'],
    ['isBouwgrond', 'bg', 'vinkje'],
    ['aantalVerkopers', 'av', 'getal'],
    ['aankoopkostenModus', 'akm', 'tekst'],
    ['aankoopkostenEigen', 'ake', 'getal'],
    ['werkzaamhedenModus', 'wzm', 'tekst'],
    ['werkzaamhedenEigen', 'wze', 'getal'],
    ['landmeter', 'lm', 'getal_of_null'],
    ['diagnostics', 'dg', 'getal_of_null'],
    ['mainlevee', 'ml', 'getal_of_null'],
    ['deRuyter', 'dr', 'vinkje']
];

/**
 * Codeert de invoer als querystring. Waarden die gelijk zijn aan de standaard
 * worden weggelaten, zodat de URL kort blijft.
 */
export function invoerNaarQuery(inv) {
    const p = new URLSearchParams();
    for (const [sleutel, param, type] of URL_VELDEN) {
        const waarde = inv[sleutel];
        const standaard = STANDAARD_INVOER[sleutel];
        if (waarde === standaard) continue;
        if (type === 'getal_of_null') {
            if (waarde === null || waarde === undefined || waarde === '') continue;
            p.set(param, String(waarde));
        } else if (type === 'vinkje') {
            p.set(param, waarde ? '1' : '0');
        } else {
            if (waarde === null || waarde === undefined) continue;
            p.set(param, String(waarde));
        }
    }
    return p.toString();
}

/**
 * Leest een querystring terug naar een volledige invoer, aangevuld met de
 * standaardwaarden. Onbekende parameters worden genegeerd.
 */
export function queryNaarInvoer(query) {
    const p = new URLSearchParams(String(query || '').replace(/^\?/, ''));
    const inv = { ...STANDAARD_INVOER };
    for (const [sleutel, param, type] of URL_VELDEN) {
        if (!p.has(param)) continue;
        const ruw = p.get(param);
        if (type === 'vinkje') {
            inv[sleutel] = ruw === '1' || ruw === 'true';
        } else if (type === 'getal' || type === 'getal_of_null') {
            const n = Number(ruw);
            if (Number.isFinite(n)) inv[sleutel] = n;
        } else {
            inv[sleutel] = ruw;
        }
    }
    return inv;
}

/**
 * Controleert de invoer. Een niet-lege uitkomst betekent: geen berekening
 * tonen, wel de meldingen.
 */
export function valideer(inv, dmtoData) {
    const fouten = [];
    const koopt = inv.rol === 'kopen' || inv.rol === 'beide';
    const verkoopt = inv.rol === 'verkopen' || inv.rol === 'beide';
    const negatief = (v) => v !== null && v !== undefined && v !== '' && Number(v) < 0;

    if (!(Number(inv.verkoopprijs) > 0)) {
        fouten.push('Vul een verkoopprijs groter dan nul in.');
    }
    const bedragen = [
        ['de aankoopsom', inv.aankoopprijs],
        ['de makelaarscourtage', inv.makelaarPerc],
        ['de werkelijke aankoopkosten', inv.aankoopkostenEigen],
        ['de werkelijke kosten van werkzaamheden', inv.werkzaamhedenEigen],
        ['de landmeter', inv.landmeter],
        ['de diagnostics', inv.diagnostics],
        ['de mainlevée', inv.mainlevee],
        ['de verkoopprijs', inv.verkoopprijs]
    ];
    for (const [naam, waarde] of bedragen) {
        if (negatief(waarde)) fouten.push(`Het bedrag voor ${naam} kan niet negatief zijn.`);
    }
    if (verkoopt) {
        if (!inv.datumAankoop || !inv.datumVerkoop) {
            fouten.push('Vul zowel een aankoopdatum als een verkoopdatum in.');
        } else if (inv.datumVerkoop < inv.datumAankoop) {
            fouten.push('De verkoopdatum ligt vóór de aankoopdatum.');
        }
    }
    if (koopt && !inv.isNieuwbouw && !zoekDepartement(dmtoData, inv.postcode)) {
        fouten.push('Het tarief voor deze postcode staat niet in de DGFiP-tabel. Er wordt niet teruggevallen op een standaardtarief.');
    }
    if (Number(inv.aantalVerkopers) < 1) {
        fouten.push('Het aantal verkopers moet minstens één zijn.');
    }
    return fouten;
}

/** Het bedrag dat er voor deze rol toe doet. */
export function kernbedrag(rol, res) {
    return rol === 'kopen' ? res.totaalKostenKoper : res.nettoOpbrengst;
}

/** Datum een jaar later, in ISO-notatie. */
export function jaarLater(isoDatum) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDatum || '').trim());
    return m ? `${Number(m[1]) + 1}-${m[2]}-${m[3]}` : isoDatum;
}

/**
 * Maximaal drie gevoeligheden, elk met een bedrag uit het bestaande model.
 * Alleen wat in het gekozen scenario van toepassing is.
 */
export function berekenGevoeligheden(inv, dmtoData) {
    const rol = inv.rol || 'beide';
    const koopt = rol === 'kopen' || rol === 'beide';
    const verkoopt = rol === 'verkopen' || rol === 'beide';
    const basis = berekenScenario(inv, dmtoData);
    const uit = [];

    /* Elke gevoeligheid wordt gemeten op de maatstaf waar het verschil
     * daadwerkelijk landt. De courtagekeuze raakt bijvoorbeeld alleen de
     * grondslag van de notaris en dus de koper, niet de netto-opbrengst van de
     * verkoper. Meten op de verkeerde maatstaf laat hem ten onrechte wegvallen. */
    const voegToe = (label, metriek, variant) => {
        const lees = (r) => (metriek === 'koper' ? r.totaalKostenKoper : r.nettoOpbrengst);
        const voor = lees(basis);
        const na = lees(berekenScenario(variant, dmtoData));
        if (voor === null || na === null) return;
        const delta = rond2(na - voor);
        if (delta === 0) return;
        uit.push({ label, metriek, delta, gunstig: metriek === 'koper' ? delta < 0 : delta > 0 });
    };

    if (inv.makelaarOptie === 'vendeur' || inv.makelaarOptie === 'acquereur') {
        const anders = inv.makelaarOptie === 'vendeur' ? 'acquereur' : 'vendeur';
        const naam = anders === 'acquereur' ? 'charge acquéreur' : 'charge vendeur';
        voegToe(`Courtage ${naam} in plaats van de huidige keuze`,
            koopt ? 'koper' : 'verkoper', { ...inv, makelaarOptie: anders });
    }
    if (koopt && !inv.isNieuwbouw && !inv.isPrimo
        && basis.departement && basis.departement.primo < basis.departement.std) {
        voegToe('Als u primo-accédant bent', 'koper', { ...inv, isPrimo: true });
    }
    if (verkoopt && !inv.isHoofdverblijf && basis.brutoMeerwaarde > 0 && basis.abatPs < 100) {
        voegToe('Een jaar langer wachten met verkopen', 'verkoper',
            { ...inv, datumVerkoop: jaarLater(inv.datumVerkoop) });
    }
    return uit.slice(0, 3);
}

/* =====================================================================
 * INTERFACE
 * ===================================================================== */

if (typeof document !== 'undefined') {
    const fmt = (n) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n);
    const fmt2 = (n) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);

    const el = (id) => document.getElementById(id);
    const toon = (id, aan) => { const n = el(id); if (n) n.style.display = aan ? '' : 'none'; };
    const POSTEN_MET_KNOP = ['landmeter', 'diagnostics', 'mainlevee'];

    let dmtoData = null;

    function toggleFiscaleOpties() {
        el('de_ruyter').disabled = el('is_hoofdverblijf').checked;
    }

    /* "Weet ik niet": de post wordt niet meegerekend en de uitkomst wordt op
     * dat punt als onvolledig gemeld. Er komt geen geschat bedrag voor in de
     * plaats. */
    function toggleWeetNiet(post) {
        const knop = el(`wn_${post}`);
        const veld = el(post);
        const aan = knop.getAttribute('aria-pressed') !== 'true';
        knop.setAttribute('aria-pressed', aan ? 'true' : 'false');
        veld.disabled = aan;
        if (aan) veld.value = '';
        calculate();
    }

    function leesBedragOfNull(id) {
        const veld = el(id);
        if (veld.disabled) return null;
        const waarde = veld.value.trim();
        return waarde === '' ? null : Number(waarde);
    }

    function leesInvoer() {
        const rolVeld = document.querySelector('input[name="rol"]:checked');
        return {
            rol: rolVeld ? rolVeld.value : 'beide',
            postcode: el('postcode').value,
            isNieuwbouw: document.querySelector('input[name="type_woning"]:checked').value === 'vefa',
            isPrimo: el('primo_accedant').checked,
            remisePct: el('remise_aan').checked ? Number(el('remise_pct').value) || 0 : 0,
            makelaarOptie: el('makelaar_optie').value,
            makelaarPerc: Number(el('makelaar_perc').value) || 0,
            verkoopprijs: Number(el('verkoopprijs').value) || 0,
            aankoopprijs: Number(el('aankoopprijs').value) || 0,
            datumAankoop: el('datum_aankoop').value,
            datumVerkoop: el('datum_verkoop').value,
            isHoofdverblijf: el('is_hoofdverblijf').checked,
            isNietIngezetene: el('fiscale_woonplaats').value === 'buiten',
            isGemeubileerdReeel: el('gemeubileerd_reeel').checked,
            isBouwgrond: el('is_bouwgrond').checked,
            aantalVerkopers: Number(el('aantal_verkopers').value) || 1,
            aankoopkostenModus: el('aankoopkosten_modus').value,
            aankoopkostenEigen: Number(el('aankoopkosten_eigen').value) || 0,
            werkzaamhedenModus: el('werkzaamheden_modus').value,
            werkzaamhedenEigen: Number(el('werkzaamheden_eigen').value) || 0,
            landmeter: leesBedragOfNull('landmeter'),
            diagnostics: leesBedragOfNull('diagnostics'),
            mainlevee: leesBedragOfNull('mainlevee'),
            deRuyter: el('de_ruyter').checked
        };
    }

    /* Zet een invoerobject terug in de interface. Gebruikt bij het laden van
     * een gedeelde URL. */
    function pasInvoerToe(inv) {
        for (const knop of document.querySelectorAll(`input[name="rol"]`)) {
            knop.checked = knop.value === inv.rol;
        }
        for (const knop of document.querySelectorAll('input[name="type_woning"]')) {
            knop.checked = (knop.value === 'vefa') === Boolean(inv.isNieuwbouw);
        }
        el('postcode').value = inv.postcode;
        el('primo_accedant').checked = Boolean(inv.isPrimo);
        el('remise_aan').checked = Number(inv.remisePct) > 0;
        if (Number(inv.remisePct) > 0) el('remise_pct').value = inv.remisePct;
        el('makelaar_optie').value = inv.makelaarOptie;
        el('makelaar_perc').value = inv.makelaarPerc;
        el('verkoopprijs').value = inv.verkoopprijs;
        el('aankoopprijs').value = inv.aankoopprijs;
        el('datum_aankoop').value = inv.datumAankoop;
        el('datum_verkoop').value = inv.datumVerkoop;
        el('is_hoofdverblijf').checked = Boolean(inv.isHoofdverblijf);
        el('fiscale_woonplaats').value = inv.isNietIngezetene ? 'buiten' : 'fr';
        el('gemeubileerd_reeel').checked = Boolean(inv.isGemeubileerdReeel);
        el('is_bouwgrond').checked = Boolean(inv.isBouwgrond);
        el('aantal_verkopers').value = inv.aantalVerkopers;
        el('aankoopkosten_modus').value = inv.aankoopkostenModus;
        el('aankoopkosten_eigen').value = inv.aankoopkostenEigen || '';
        el('werkzaamheden_modus').value = inv.werkzaamhedenModus;
        el('werkzaamheden_eigen').value = inv.werkzaamhedenEigen || '';
        for (const post of POSTEN_MET_KNOP) {
            const waarde = inv[post];
            el(post).disabled = false;
            el(`wn_${post}`).setAttribute('aria-pressed', 'false');
            el(post).value = (waarde === null || waarde === undefined) ? '' : waarde;
        }
        el('de_ruyter').checked = Boolean(inv.deRuyter);
    }

    function adviesTekst(post, naam) {
        if (post.eigen === 0 && post.forfait === 0) return '';
        if (post.gunstigste === 'werkelijk') {
            return `Uw werkelijke ${naam} liggen ${fmt2(post.verschil)} hoger dan het forfait van ${fmt2(post.forfait)}. De werkelijke kosten zijn dus gunstiger.`;
        }
        return `Het forfait van ${fmt2(post.forfait)} ligt ${fmt2(post.verschil)} hoger dan uw opgave van ${fmt2(post.eigen)}. Het forfait is dus gunstiger.`;
    }

    function calculate() {
        if (!dmtoData) return;

        const inv = leesInvoer();
        const koopt = inv.rol === 'kopen' || inv.rol === 'beide';
        const verkoopt = inv.rol === 'verkopen' || inv.rol === 'beide';

        // Zichtbaarheid per rol
        toon('sectie_koper', koopt);
        toon('sectie_verkoper_bedragen', verkoopt);
        toon('sectie_fiscaal', verkoopt);
        toon('makelaar_perc_wrapper', inv.makelaarOptie !== 'geen');
        toon('primo_wrapper', !inv.isNieuwbouw);
        toon('remise_pct_wrapper', el('remise_aan').checked);
        toon('aankoopkosten_eigen_wrapper', inv.aankoopkostenModus === 'werkelijk');
        toon('werkzaamheden_eigen_wrapper', inv.werkzaamhedenModus === 'werkelijk');

        // Scenario in de URL, zodat het te bookmarken en te delen is. In een
        // sandboxed iframe zonder allow-same-origin gooit replaceState; dat mag
        // de berekening niet meeslepen.
        try {
            const query = invoerNaarQuery(inv);
            history.replaceState(null, '', query ? `?${query}` : location.pathname);
        } catch (err) {
            /* URL-deelbaarheid is een extraatje, geen voorwaarde. */
        }

        // Validatie: bij een fout geen uitkomst tonen
        const fouten = valideer(inv, dmtoData);
        if (fouten.length > 0) {
            el('validatie').innerHTML = `
                <div class="waarschuwing">
                    <div class="waarschuwing-titel">De invoer is nog niet compleet</div>
                    <ul>${fouten.map((f) => `<li>${f}</li>`).join('')}</ul>
                </div>`;
            toon('uitkomst', false);
            return;
        }
        el('validatie').innerHTML = '';
        toon('uitkomst', true);

        const res = berekenScenario(inv, dmtoData);
        el('jaren_bezit_label').innerText = `Jaren bezit: ${res.jarenBezit}`;
        el('aankoopkosten_advies').innerText =
            inv.aankoopkostenModus === 'werkelijk' ? adviesTekst(res.aankoopkosten, 'aankoopkosten') : '';
        el('werkzaamheden_advies').innerText =
            inv.werkzaamhedenModus === 'werkelijk' ? adviesTekst(res.werkzaamheden, 'kosten') : '';

        // --- De uitkomst in één zin ---
        const zinnen = [];
        if (koopt && res.totaalKostenKoper !== null) {
            const bovenop = rond2(res.totaalKostenKoper - res.prijsVoorNotaris);
            zinnen.push(`Deze aankoop kost u in totaal <strong>${fmt(res.totaalKostenKoper)}</strong>: ${fmt(res.prijsVoorNotaris)} koopsom plus ${fmt(bovenop)} aan kosten.`);
        }
        if (verkoopt) {
            zinnen.push(`Van deze verkoop houdt u netto <strong>${fmt(res.nettoOpbrengst)}</strong> over.`);
        }
        el('uitkomst_zin').innerHTML = zinnen.join('<br>');

        // --- Specificatie ---
        let notarisLabel = `Over ${fmt(res.prijsVoorNotaris)} (Grondslag)`;
        if (inv.isNieuwbouw) notarisLabel += ' - VEFA';
        else if (res.departement) notarisLabel += ` - ${res.departement.code} ${res.departement.naam}, ${res.tarief.toFixed(2)}% dep.${inv.isPrimo ? ' (primo-accédant)' : ''}`;
        if (res.remise > 0) notarisLabel += `, korting op emolumenten ${fmt2(res.remise)}`;
        notarisLabel += `<br><em>waaronder ${fmt(DEBOURS_FORFAIT)} débours: een schatting, geen tarief</em>`;

        const makelaarTekst = inv.makelaarOptie === 'geen' ? '-' : `${inv.makelaarPerc}%`;
        const pvToelichting = res.pvReden === 'vrijstelling hoofdverblijf'
            ? 'Vrijstelling: Hoofdverblijf'
            : res.pvReden === 'geen winst na aftrek'
                ? 'Geen winst na aftrek'
                : `Winst na aftrek: ${fmt(res.brutoMeerwaarde)}<br>Aftrek: ${res.abatIr.toFixed(1)}% (IR) / ${res.abatPs.toFixed(1)}% (Soc)`;
        const surtaxeToelichting = inv.isBouwgrond
            ? 'Niet van toepassing: bouwgrond'
            : `Boven ${fmt(SURTAXE_DREMPEL)} per verkoper, ${inv.aantalVerkopers} verkoper(s)`;
        const onbekend = (post) => res.onbekendePosten.includes(post) ? '<em>niet opgegeven</em>' : '';

        const rijen = [];
        if (koopt) {
            rijen.push(`<tr><td colspan="3" class="spec-kop">KOSTEN KOPER</td></tr>
                <tr>
                    <td>Notariskosten</td>
                    <td class="spec-toelichting">${notarisLabel}</td>
                    <td class="amount">${res.notarisKosten === null ? '—' : fmt2(res.notarisKosten)}</td>
                </tr>`);
        }
        if (koopt && verkoopt) rijen.push('<tr><td colspan="3" style="height:10px;"></td></tr>');
        if (verkoopt) {
            rijen.push(`<tr><td colspan="3" class="spec-kop">KOSTEN VERKOPER</td></tr>
                <tr>
                    <td>Makelaarscourtage</td>
                    <td class="spec-toelichting">${makelaarTekst}</td>
                    <td class="amount">${fmt2(res.makelaarsKosten)}</td>
                </tr>
                <tr>
                    <td>Plus-value belasting</td>
                    <td class="spec-toelichting">${pvToelichting}</td>
                    <td class="amount">${fmt2(res.plusValueTax)}</td>
                </tr>
                <tr>
                    <td>Taxe op hoge meerwaarden</td>
                    <td class="spec-toelichting">${surtaxeToelichting}</td>
                    <td class="amount">${fmt2(res.surtaxe)}</td>
                </tr>
                <tr>
                    <td>Landmeter</td>
                    <td class="spec-toelichting">${onbekend('landmeter')}</td>
                    <td class="amount">${fmt2(res.landmeter)}</td>
                </tr>
                <tr>
                    <td>Diagnostics</td>
                    <td class="spec-toelichting">${onbekend('diagnostics')}</td>
                    <td class="amount">${fmt2(res.diagnostics)}</td>
                </tr>
                <tr>
                    <td>Mainlevée</td>
                    <td class="spec-toelichting">${onbekend('mainlevée')}</td>
                    <td class="amount">${fmt2(res.mainlevee)}</td>
                </tr>
                <tr style="border-top:2px solid #ddd;">
                    <td><strong>Totaal afhoudingen</strong></td>
                    <td></td>
                    <td class="amount"><strong>${fmt2(res.totaalKostenVerkoper)}</strong></td>
                </tr>`);
        }
        el('spec_table').innerHTML = rijen.join('');

        el('dmto_peildatum').innerHTML = koopt
            ? `DMTO-tarieven volgens ${dmtoData._meta.uitgever}, peildatum ${dmtoData._meta.peildatum} `
              + `(<a href="${dmtoData._meta.bron}" target="_blank" rel="noopener noreferrer">bron</a>)`
            : '';

        // --- Onvolledige posten ---
        const posten = res.onbekendePosten;
        const opsomming = posten.length > 1
            ? `${posten.slice(0, -1).join(', ')} en ${posten[posten.length - 1]}`
            : posten[0];
        el('onvolledig').innerHTML = (verkoopt && posten.length > 0) ? `
            <div class="waarschuwing">
                <div class="waarschuwing-titel">Deze uitkomst is onvolledig</div>
                <p>U heeft geen bedrag opgegeven voor ${opsomming}.
                ${posten.length > 1 ? 'Die posten tellen' : 'Die post telt'} daardoor niet mee,
                niet als nul maar als onbekend. Uw werkelijke kosten liggen dus hoger dan hier
                staat. Vul ${posten.length > 1 ? 'de bedragen' : 'het bedrag'} in zodra u
                ${posten.length > 1 ? 'ze' : 'het'} weet.</p>
            </div>` : '';

        // --- Gevoeligheden ---
        const gev = berekenGevoeligheden(inv, dmtoData);
        el('gevoeligheden').innerHTML = gev.length === 0 ? '' : `
            <div class="gevoeligheden">
                <div class="gevoeligheden-titel">Wat scheelt het als u iets verandert?</div>
                ${gev.map((g) => `<div class="gevoeligheid">
                    <span>${g.label}<br><span class="hint">${g.metriek === 'koper' ? 'in uw totale aankoopkosten' : 'in wat u netto overhoudt'}</span></span>
                    <span class="amount ${g.gunstig ? 'gunstig' : 'ongunstig'}">${g.delta > 0 ? '+' : ''}${fmt2(g.delta)}</span>
                </div>`).join('')}
            </div>`;

        // --- Kaarten, per rol ---
        const kaart = (n, label, waarde, sub) => {
            toon(`card_${n}`, label !== null);
            if (label === null) return;
            el(`card_${n}_label`).innerText = label;
            el(`card_${n}_sub`).innerText = sub;
            el(n === 1 ? 'res_netto' : n === 2 ? 'res_winst' : 'res_frictie').innerText = waarde;
        };
        if (koopt && !verkoopt) {
            kaart(1, 'Totale aankoopkosten', res.totaalKostenKoper === null ? '—' : fmt(res.totaalKostenKoper), 'Koopsom plus alle kosten');
            kaart(2, 'Notariskosten', res.notarisKosten === null ? '—' : fmt(res.notarisKosten), 'Frais d’acquisition');
            kaart(3, null);
        } else if (verkoopt && !koopt) {
            kaart(1, 'Netto Opbrengst', fmt(res.nettoOpbrengst), 'Op bankrekening verkoper');
            kaart(2, 'Werkelijke Winst', fmt(res.werkelijkeWinst), 'Netto - Aankoopsom');
            kaart(3, null);
        } else {
            kaart(1, 'Netto Opbrengst', fmt(res.nettoOpbrengst), 'Op bankrekening verkoper');
            kaart(2, 'Werkelijke Winst', fmt(res.werkelijkeWinst), 'Netto - Aankoopsom');
            kaart(3, 'Frictiekosten', res.frictiekosten === null ? '—' : fmt(res.frictiekosten), 'Verdwenen in de keten');
        }

        // --- Toelichting ---
        let uitleg = '<strong>Validatie van berekening:</strong><br>';
        if (verkoopt && inv.isHoofdverblijf) {
            uitleg += '✅ Object is Hoofdverblijf. Volledige vrijstelling Plus-Value.';
        } else if (verkoopt && res.brutoMeerwaarde > 0) {
            uitleg += `Jaren bezit: ${res.jarenBezit}.<br>`;
            uitleg += `Aftrek Inkomstenbelasting: ${res.abatIr.toFixed(1)}%.<br>`;
            uitleg += `Aftrek Sociale Lasten: ${res.abatPs.toFixed(1)}% (Tarief: ${inv.deRuyter ? '7.5% - De Ruyter' : '17.2% - Standaard'}).`;
            if (res.surtaxe > 0) {
                uitleg += `<br>Belastbare meerwaarde na abattement: ${fmt(res.belastbaarIr)}, verdeeld over ${inv.aantalVerkopers} verkoper(s). Taxe art. 1609 nonies G CGI van toepassing.`;
            }
        } else if (verkoopt) {
            uitleg += 'Geen belastbare meerwaarde na aftrek.';
        } else {
            uitleg += `Notariskosten berekend over ${fmt(res.prijsVoorNotaris)}${res.departement ? `, departement ${res.departement.code} ${res.departement.naam}` : ''}.`;
        }
        el('tax_explanation').innerHTML = uitleg;

        // --- Signaleringen ---
        const signaleringen = bepaalSignaleringen({
            rol: inv.rol,
            belastbareMeerwaarde: res.belastbaarIr,
            isNietIngezetene: inv.isNietIngezetene,
            isGemeubileerdReeel: inv.isGemeubileerdReeel
        });
        el('signaleringen').innerHTML = signaleringen.map((s) => `
            <div class="signalering">
                <div class="signalering-titel">${s.titel}</div>
                <p>${s.tekst}</p>
                ${s.artikelen.length ? `<p class="signalering-artikelen">${s.artikelen.join(' · ')}</p>` : ''}
                <p><a data-artikel-link href="${ARTIKEL_URL}" target="_blank" rel="noopener noreferrer">Lees de uitleg in het artikel</a></p>
            </div>`).join('');
    }

    window.calculate = calculate;
    window.toggleFiscaleOpties = toggleFiscaleOpties;
    window.toggleWeetNiet = toggleWeetNiet;

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
            if (location.search) pasInvoerToe(queryNaarInvoer(location.search));
            toggleFiscaleOpties();
            calculate();
        })
        .catch((err) => {
            el('validatie').innerHTML =
                `<div class="waarschuwing"><div class="waarschuwing-titel">De tarieventabel kon niet worden geladen</div>`
                + `<p>dmto.json is niet bereikbaar (${err.message}). Er wordt niet gerekend met een terugvaltarief.</p></div>`;
            toon('uitkomst', false);
        });
}
