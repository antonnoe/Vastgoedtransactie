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
    const landmeter = Math.max(0, Number(inv.landmeter) || 0);
    const mainlevee = Math.max(0, Number(inv.mainlevee) || 0);

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
    const verkoopkosten = landmeter + mainlevee;
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

    const totaalKostenVerkoper = makelaarsKosten + plusValueTax + surtaxe + landmeter + mainlevee;
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
        landmeter, mainlevee, verkoopkosten,
        totaalKostenVerkoper, nettoOpbrengst,
        werkelijkeWinst: nettoOpbrengst - aankoopprijs,
        totaalKostenKoper,
        frictiekosten: notarisKosten === null ? null : notarisKosten + totaalKostenVerkoper
    };
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
    const fmt = (num) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
    const fmt2 = (num) => new Intl.NumberFormat('nl-NL', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(num);

    const el = (id) => document.getElementById(id);
    const toon = (id, aan) => { const n = el(id); if (n) n.style.display = aan ? '' : 'none'; };

    let dmtoData = null;

    function toggleFiscaleOpties() {
        el('de_ruyter').disabled = el('is_hoofdverblijf').checked;
    }

    function huidigeRol() {
        const veld = document.querySelector('input[name="rol"]:checked');
        return veld ? veld.value : 'beide';
    }

    /* Alle invoer uit de interface als plat object. */
    function leesInvoer() {
        return {
            rol: huidigeRol(),
            postcode: el('postcode').value,
            isNieuwbouw: document.querySelector('input[name="type_woning"]:checked').value === 'vefa',
            isPrimo: el('primo_accedant').checked,
            remisePct: el('remise_aan').checked ? parseFloat(el('remise_pct').value) || 0 : 0,
            makelaarOptie: el('makelaar_optie').value,
            makelaarPerc: parseFloat(el('makelaar_perc').value) || 0,
            verkoopprijs: parseFloat(el('verkoopprijs').value) || 0,
            aankoopprijs: parseFloat(el('aankoopprijs').value) || 0,
            datumAankoop: el('datum_aankoop').value,
            datumVerkoop: el('datum_verkoop').value,
            isHoofdverblijf: el('is_hoofdverblijf').checked,
            isNietIngezetene: el('fiscale_woonplaats').value === 'buiten',
            isGemeubileerdReeel: el('gemeubileerd_reeel').checked,
            isBouwgrond: el('is_bouwgrond').checked,
            aantalVerkopers: Math.max(1, parseInt(el('aantal_verkopers').value, 10) || 1),
            aankoopkostenModus: el('aankoopkosten_modus').value,
            aankoopkostenEigen: parseFloat(el('aankoopkosten_eigen').value) || 0,
            werkzaamhedenModus: el('werkzaamheden_modus').value,
            werkzaamhedenEigen: parseFloat(el('werkzaamheden_eigen').value) || 0,
            landmeter: parseFloat(el('landmeter').value) || 0,
            mainlevee: parseFloat(el('mainlevee').value) || 0,
            deRuyter: el('de_ruyter').checked
        };
    }

    /* Advies bij een eigen bedrag: welke van de twee is gunstiger? */
    function adviesTekst(post, naam) {
        if (post.eigen === 0 && post.forfait === 0) return '';
        if (post.gunstigste === 'werkelijk') {
            return `Uw werkelijke ${naam} liggen ${fmt2(post.verschil)} hoger dan het forfait van ${fmt2(post.forfait)}. `
                 + `De werkelijke kosten zijn dus gunstiger.`;
        }
        return `Het forfait van ${fmt2(post.forfait)} ligt ${fmt2(post.verschil)} hoger dan uw opgave van ${fmt2(post.eigen)}. `
             + `Het forfait is dus gunstiger.`;
    }

    function calculate() {
        if (!dmtoData) return;

        const inv = leesInvoer();
        const res = berekenScenario(inv, dmtoData);

        el('jaren_bezit_label').innerText = `Jaren bezit: ${res.jarenBezit}`;

        // Zichtbaarheid van afhankelijke velden
        toon('makelaar_perc_wrapper', inv.makelaarOptie !== 'geen');
        toon('primo_wrapper', !inv.isNieuwbouw);
        toon('remise_pct_wrapper', el('remise_aan').checked);
        toon('aankoopkosten_eigen_wrapper', inv.aankoopkostenModus === 'werkelijk');
        toon('werkzaamheden_eigen_wrapper', inv.werkzaamhedenModus === 'werkelijk');

        el('aankoopkosten_advies').innerText =
            inv.aankoopkostenModus === 'werkelijk' ? adviesTekst(res.aankoopkosten, 'aankoopkosten') : '';
        el('werkzaamheden_advies').innerText =
            inv.werkzaamhedenModus === 'werkelijk' ? adviesTekst(res.werkzaamheden, 'kosten') : '';

        // --- Specificatie ---
        let notarisLabel = `Over ${fmt(res.prijsVoorNotaris)} (Grondslag)`;
        if (inv.isNieuwbouw) notarisLabel += ' - VEFA';
        else if (res.departement) notarisLabel += ` - ${res.departement.code} ${res.departement.naam}, ${res.tarief.toFixed(2)}% dep.${inv.isPrimo ? ' (primo-accédant)' : ''}`;
        else notarisLabel = 'Het tarief voor dit gebied staat niet in de DGFiP-tabel. Notariskosten niet berekend.';
        if (res.remise > 0) notarisLabel += ` - korting op emolumenten ${fmt2(res.remise)}`;

        const makelaarTekst = inv.makelaarOptie === 'geen' ? '-' : `${inv.makelaarPerc}%`;
        const pvToelichting = res.pvReden === 'vrijstelling hoofdverblijf'
            ? 'Vrijstelling: Hoofdverblijf'
            : res.pvReden === 'geen winst na aftrek'
                ? 'Geen winst na aftrek'
                : `Winst na aftrek: ${fmt(res.brutoMeerwaarde)}<br>Aftrek: ${res.abatIr.toFixed(1)}% (IR) / ${res.abatPs.toFixed(1)}% (Soc)`;
        const surtaxeToelichting = inv.isBouwgrond
            ? 'Niet van toepassing: bouwgrond'
            : `Boven ${fmt(SURTAXE_DREMPEL)} per verkoper, ${inv.aantalVerkopers} verkoper(s)`;

        el('spec_table').innerHTML = `
            <tr><td colspan="3" style="font-weight:700; background-color:#f9f9f9;">KOSTEN KOPER</td></tr>
            <tr>
                <td>Notariskosten</td>
                <td class="spec-toelichting">${notarisLabel}</td>
                <td class="amount">${res.notarisKosten === null ? '—' : fmt2(res.notarisKosten)}</td>
            </tr>
            <tr><td colspan="3" style="height:10px;"></td></tr>
            <tr><td colspan="3" style="font-weight:700; background-color:#f9f9f9;">KOSTEN VERKOPER</td></tr>
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
                <td>Landmeter / Diagnostics</td>
                <td class="spec-toelichting"></td>
                <td class="amount">${fmt2(res.landmeter)}</td>
            </tr>
            <tr>
                <td>Mainlevée</td>
                <td class="spec-toelichting"></td>
                <td class="amount">${fmt2(res.mainlevee)}</td>
            </tr>
            <tr style="border-top:2px solid #ddd;">
                <td><strong>Totaal afhoudingen</strong></td>
                <td></td>
                <td class="amount"><strong>${fmt2(res.totaalKostenVerkoper)}</strong></td>
            </tr>`;

        el('dmto_peildatum').innerHTML =
            `DMTO-tarieven volgens ${dmtoData._meta.uitgever}, peildatum ${dmtoData._meta.peildatum} ` +
            `(<a href="${dmtoData._meta.bron}" target="_blank" rel="noopener noreferrer">bron</a>)`;

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

        // --- Kaarten ---
        el('res_netto').innerText = fmt(res.nettoOpbrengst);
        el('res_winst').innerText = fmt(res.werkelijkeWinst);
        el('res_frictie').innerText = res.frictiekosten === null ? '—' : fmt(res.frictiekosten);

        // --- Toelichting ---
        let explanation = '<strong>Validatie van berekening:</strong><br>';
        if (res.notarisKosten === null) {
            explanation += '⚠️ Het tarief voor dit gebied staat niet in de DGFiP-tabel. Notariskosten niet berekend.<br>';
        }
        if (inv.isHoofdverblijf) {
            explanation += '✅ Object is Hoofdverblijf. Volledige vrijstelling Plus-Value.';
        } else if (res.brutoMeerwaarde > 0) {
            explanation += `Jaren bezit: ${res.jarenBezit}. <br>`;
            explanation += `Aftrek Inkomstenbelasting: ${res.abatIr.toFixed(1)}%. <br>`;
            explanation += `Aftrek Sociale Lasten: ${res.abatPs.toFixed(1)}% (Tarief: ${inv.deRuyter ? '7.5% - De Ruyter' : '17.2% - Standaard'}).`;
            if (res.surtaxe > 0) {
                explanation += `<br>Belastbare meerwaarde na abattement: ${fmt(res.belastbaarIr)}, verdeeld over ${inv.aantalVerkopers} verkoper(s). Taxe art. 1609 nonies G CGI van toepassing.`;
            }
        } else {
            explanation += 'Geen belastbare meerwaarde na aftrek.';
        }
        el('tax_explanation').innerHTML = explanation;

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
            el('tax_explanation').innerHTML =
                `<strong>Fout:</strong> de tarieventabel dmto.json kon niet worden geladen (${err.message}). ` +
                'Er wordt niet gerekend met een terugvaltarief.';
        });
}
