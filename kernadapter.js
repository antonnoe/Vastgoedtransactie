/* ── KOPPELVLAK ──────────────────────────────────────────────────────────────
 *
 * De enige laag waar de presentatielaag bedragen vandaan haalt. De schil kent
 * geen functienaam, veldnaam of getal van de rekenkern; deze adapter vertaalt
 * beide kanten op.
 *
 * Er staat hier bewust geen tarief, percentage, bedrag of peildatum. De
 * peildatum en de bron komen uit het _meta-blok van dmto.json, dat één keer bij
 * het opstarten wordt geladen. Mislukt dat, dan wordt er niets getoond: de
 * schil rekent nooit stilzwijgend door zonder tarieventabel.
 */

import * as kern from './calc.js';

/* ── De tarieventabel ──────────────────────────────────────────────────── */

let dmtoData = null;

/** Laadt dmto.json één keer. Gooit als het niet lukt; de schil vangt dat af. */
export async function laadTarieven(pad = 'dmto.json') {
    if (dmtoData) return dmtoData;
    const antwoord = await fetch(pad);
    if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
    const data = await antwoord.json();
    if (!data || !data._meta || !data.departementen) {
        throw new Error('dmto.json mist _meta of departementen');
    }
    dmtoData = data;
    return dmtoData;
}

/** Voor gebruik buiten de browser, bijvoorbeeld in de testset. */
export function zetTarieven(data) {
    dmtoData = data;
    return dmtoData;
}

export function tarievenGeladen() {
    return dmtoData !== null;
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** Een datum uit dmto.json als leesbare Nederlandse datum. Opmaak, geen tarief. */
export function nederlandseDatum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return String(iso || '');
    return `${Number(m[3])} ${MAANDEN[Number(m[2]) - 1]} ${m[1]}`;
}

/** Peildatum en bron, uit het bestand. Nooit uit de code. */
export function laadMeta() {
    if (!dmtoData) return { peildatum: null, bron: null, bronUrl: null };
    return {
        peildatum: nederlandseDatum(dmtoData._meta.peildatum),
        bron: dmtoData._meta.uitgever,
        bronUrl: dmtoData._meta.bron
    };
}

/* ── De vertaaltabel ───────────────────────────────────────────────────── */

const getal = (v) => {
    if (v == null || v === '') return null;
    const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    return s === '' ? null : Number(s);
};

const onbekend = (weetNiet, sleutel) => Boolean(weetNiet && weetNiet[sleutel]);

/** Een postbedrag: null als de gebruiker "weet ik niet" koos of niets invulde. */
const post = (ui, sleutel) => (onbekend(ui.weetNiet, sleutel) ? null : getal(ui[sleutel]));

/* De schil noemt de partijen koper en verkoper, de kern acquereur en vendeur. */
const PARTIJ = { koper: 'acquereur', verkoper: 'vendeur', geen: 'geen' };

const ROL = { koper: 'kopen', verkoper: 'verkopen', beide: 'beide' };

/**
 * UI-veldnamen naar kernveldnamen. Eén plek, één tabel. Verandert er iets aan
 * de velden van de schil, dan verandert alleen deze functie.
 */
export function naarKern(ui = {}) {
    const verfijning = ui.verfijning || {};
    const erfOfSchenking = ui.verkrijging === 'geerfd' || ui.verkrijging === 'geschonken';

    /* De kosten van de verkrijging lopen via één kernveld. Bij erven of
     * schenken komt het uit het eigen veld verkrijgingskosten, bij een aankoop
     * uit de verfijning "ik heb de akte en de facturen nog". */
    const kostenVerkrijging = erfOfSchenking
        ? post(ui, 'verkrijgingskosten')
        : (verfijning.aktes ? getal(ui.aktesBedrag) : null);

    /* De korting op het notarishonorarium is in de schil aan of uit. Aan
     * betekent het wettelijke maximum, en dus het gunstigste geval. */
    const korting = verfijning.kortingHonorarium ? kern.REMISE_MAX_PCT : 0;

    return {
        rol: ROL[ui.rol] || 'beide',
        postcode: ui.postcode || '',

        /* Koopsom en verkoopprijs zijn twee onafhankelijke bedragen. */
        koopsom: getal(ui.koopsom),
        verkoopprijs: getal(ui.verkoopprijs) || 0,

        isNieuwbouw: ui.type === 'nieuwbouw',
        isPrimo: Boolean(verfijning.eersteWoning),
        remisePct: korting,

        /* Verkoopkant van de makelaar. */
        makelaarOptie: PARTIJ[ui.mkVerkPartij] || 'geen',
        makelaarEenheid: ui.mkVerkModus === 'bedrag' ? 'bedrag' : 'percentage',
        makelaarPerc: getal(ui.mkVerkWaarde) || 0,
        makelaarBedrag: getal(ui.mkVerkWaarde) || 0,

        /* Aankoopkant van de makelaar. */
        aankoopMakelaarOptie: PARTIJ[ui.mkKoopPartij] || 'geen',
        aankoopMakelaarEenheid: ui.mkKoopModus === 'bedrag' ? 'bedrag' : 'percentage',
        aankoopMakelaarPerc: getal(ui.mkKoopWaarde) || 0,
        aankoopMakelaarBedrag: getal(ui.mkKoopWaarde) || 0,

        aankoopprijs: getal(ui.aankoopprijs) || 0,
        datumAankoop: ui.datumVerkrijging || '',
        datumVerkoop: ui.datumVerkoop || '',

        isHoofdverblijf: ui.hoofdverblijf === 'ja',
        isBouwgrond: ui.bouwgrond === 'ja',
        isNietIngezetene: Boolean(verfijning.fiscaalBuiten),
        isGemeubileerdReeel: Boolean(verfijning.gemeubileerdReel),
        deRuyter: Boolean(verfijning.verzekerdBuiten),

        aantalVerkopers: Math.max(1, Number(ui.aantalVerkopers) || 1),
        verkrijging: ui.verkrijging || 'gekocht',

        aankoopkostenModus: (erfOfSchenking || verfijning.aktes) ? 'werkelijk' : 'forfait',
        aankoopkostenEigen: kostenVerkrijging,
        werkzaamhedenModus: verfijning.verbouwd ? 'werkelijk' : 'forfait',
        werkzaamhedenEigen: verfijning.verbouwd ? (getal(ui.verbouwdBedrag) || 0) : 0,

        landmeter: post(ui, 'landmeter'),
        diagnostics: post(ui, 'diagnostics'),
        mainlevee: post(ui, 'doorhaling')
    };
}

/** Staat deze postcode in de tarieventabel? Zonder tabel: onbekend, dus false. */
export function kentPostcode(postcode) {
    if (!dmtoData) return false;
    return kern.zoekDepartement(dmtoData, postcode) !== null;
}

/* ── Delen via de URL ──────────────────────────────────────────────────── */

/* De waarden gaan via de kern de URL in, zodat er één definitie van de
 * parameters bestaat. Twee dingen zijn puur schiltoestand en horen daar niet
 * in thuis: welke verfijningen aanstaan en waar de gebruiker "weet ik niet"
 * koos. Die krijgen een eigen, korte parameter. */
const VERFIJNING_IDS = ['eersteWoning', 'makelaarKoop', 'kortingHonorarium', 'fiscaalBuiten',
    'verzekerdBuiten', 'gemeubileerdReel', 'aktes', 'verbouwd', 'makelaarVerk', 'verkoopkosten'];
const WEETNIET_SLEUTELS = ['landmeter', 'diagnostics', 'doorhaling', 'verkrijgingskosten'];

/* De keuzevragen van de schil kennen drie standen: nog niet beantwoord, of een
 * van de antwoorden. In de kern zijn het ja-neevelden, en die vallen uit de URL
 * zodra ze toevallig gelijk zijn aan de kernstandaard. Dan is "nee" niet meer
 * te onderscheiden van "nog niet gevraagd", en zou een gedeeld scenario
 * antwoorden invullen die de gebruiker nooit gaf. Ze gaan daarom apart mee. */
const KEUZEVELDEN = ['type', 'hoofdverblijf', 'bouwgrond', 'verkrijging',
    'mkKoopPartij', 'mkVerkPartij', 'mkKoopModus', 'mkVerkModus'];

export function naarQuery(ui = {}) {
    const p = new URLSearchParams(kern.invoerNaarQuery(naarKern(ui)));
    const keuzes = KEUZEVELDEN
        .filter((veld) => ui[veld] !== null && ui[veld] !== undefined && ui[veld] !== '')
        .map((veld) => `${veld}:${ui[veld]}`);
    if (keuzes.length) p.set('k', keuzes.join('.'));
    const aan = VERFIJNING_IDS.filter((id) => ui.verfijning && ui.verfijning[id]);
    if (aan.length) p.set('v', aan.join('.'));
    const onbekendeposten = WEETNIET_SLEUTELS.filter((k) => ui.weetNiet && ui.weetNiet[k]);
    if (onbekendeposten.length) p.set('wn', onbekendeposten.join('.'));
    return p.toString();
}

const bedragTekst = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('nl-NL'));

export function uitQuery(query) {
    const p = new URLSearchParams(String(query || '').replace(/^\?/, ''));
    const inv = kern.queryNaarInvoer(p.toString());

    const verfijning = {};
    for (const id of (p.get('v') || '').split('.').filter(Boolean)) verfijning[id] = true;
    const weetNiet = {};
    for (const k of (p.get('wn') || '').split('.').filter(Boolean)) weetNiet[k] = true;

    /* Eerst de keuzevragen uit hun eigen parameter; wat er niet in staat is
     * nooit beantwoord en blijft dus leeg. */
    const keuzes = {};
    for (const paar of (p.get('k') || '').split('.').filter(Boolean)) {
        const scheiding = paar.indexOf(':');
        if (scheiding > 0) keuzes[paar.slice(0, scheiding)] = paar.slice(scheiding + 1);
    }

    const antwoorden = {
        postcode: inv.postcode || '',
        koopsom: bedragTekst(inv.koopsom),
        verkoopprijs: bedragTekst(inv.verkoopprijs),
        aankoopprijs: bedragTekst(inv.aankoopprijs),
        datumVerkrijging: inv.datumAankoop || '',
        datumVerkoop: inv.datumVerkoop || '',
        aantalVerkopers: inv.aantalVerkopers || 1,
        landmeter: bedragTekst(inv.landmeter),
        diagnostics: bedragTekst(inv.diagnostics),
        doorhaling: bedragTekst(inv.mainlevee),
        mkVerkModus: keuzes.mkVerkModus || 'percentage',
        mkKoopModus: keuzes.mkKoopModus || 'percentage'
    };

    for (const veld of ['type', 'hoofdverblijf', 'bouwgrond', 'verkrijging',
        'mkKoopPartij', 'mkVerkPartij']) {
        if (veld in keuzes) antwoorden[veld] = keuzes[veld];
    }

    antwoorden.mkVerkWaarde = bedragTekst(
        antwoorden.mkVerkModus === 'bedrag' ? inv.makelaarBedrag : inv.makelaarPerc);
    antwoorden.mkKoopWaarde = bedragTekst(
        antwoorden.mkKoopModus === 'bedrag' ? inv.aankoopMakelaarBedrag : inv.aankoopMakelaarPerc);

    /* De kosten van de verkrijging staan in één kernveld en horen bij het ene
     * of het andere invoerveld, afhankelijk van hoe het pand is verkregen. */
    const erfOfSchenking = antwoorden.verkrijging === 'geerfd' || antwoorden.verkrijging === 'geschonken';
    if (erfOfSchenking) {
        antwoorden.verkrijgingskosten = bedragTekst(inv.aankoopkostenEigen);
    } else if (verfijning.aktes) {
        antwoorden.aktesBedrag = bedragTekst(inv.aankoopkostenEigen);
    }
    if (verfijning.verbouwd) antwoorden.verbouwdBedrag = bedragTekst(inv.werkzaamhedenEigen);

    return { antwoorden, verfijning, weetNiet };
}

/* ── Uitkomsten ────────────────────────────────────────────────────────── */

/**
 * Rekent één scenario door. Geeft de uitkomst terug in de vorm die de schil
 * verwacht, met null waar de kern geen bedrag heeft.
 */
export function bereken(ui) {
    if (!dmtoData) return null;
    const invoer = naarKern(ui);
    const fouten = kern.valideer(invoer, dmtoData);
    if (fouten.length > 0) return { fouten, invoer };

    const res = kern.berekenScenario(invoer, dmtoData);
    return {
        fouten: [],
        invoer,
        res,
        koper: {
            /* Twee bedragen, want de schil vraagt erom in zijn eigen zin:
             * "bovenop de koopsom kost deze aankoop u in totaal". Dat is niet
             * het alles-in bedrag uit kernbedrag(), maar wat daar bovenop komt. */
            bedrag: kern.kernbedrag('kopen', res),
            bovenopKoopsom: kern.kernbedrag('kopen', res) === null
                ? null
                : Math.round((kern.kernbedrag('kopen', res) - res.koopsom) * 100) / 100,
            posten: postenKoper(res)
        },
        verkoper: {
            vrijgesteld: res.pvReden === 'vrijstelling hoofdverblijf',
            bedrag: kern.kernbedrag('verkopen', res),
            posten: postenVerkoper(res)
        },
        onvolledig: res.onbekendePosten,
        verkrijgingskostenOnbekend: res.verkrijgingskostenOnbekend
    };
}

function postenKoper(res) {
    const spec = res.notarisSpecificatie;
    /* Deze posten tellen op tot wat er bovenop de koopsom komt; de koopsom
     * zelf staat er dus niet bij. */
    const rijen = [
        { label: 'Overdrachtsbelasting', bedrag: spec ? spec.overdrachtsbelasting : null },
        { label: 'Notarishonorarium', bedrag: spec ? spec.emolumenten : null },
        { label: 'Btw over het honorarium', bedrag: spec ? spec.tva : null },
        { label: 'Inschrijving en formaliteiten', bedrag: spec ? spec.csi : null },
        { label: 'Akte-, kadaster- en formaliteitskosten (schatting)', bedrag: spec ? spec.debours : null }
    ];
    if (spec && spec.korting > 0) {
        rijen.push({ label: 'Korting op het honorarium', bedrag: -spec.korting });
    }
    if (res.kanten.aankoop.optie === 'acquereur' && res.makelaarsKostenAankoop > 0) {
        rijen.push({ label: 'Makelaarscourtage', bedrag: res.makelaarsKostenAankoop });
    }
    return rijen;
}

function postenVerkoper(res) {
    const rijen = [
        { label: 'Verkoopprijs', bedrag: res.nettoVerkoperBasis + res.makelaarsKostenVerkoop },
        { label: 'Makelaarscourtage', bedrag: res.makelaarsKostenVerkoop > 0 ? -res.makelaarsKostenVerkoop : null },
        { label: 'Meerwaardebelasting en sociale heffingen', bedrag: res.plusValueTax > 0 ? -res.plusValueTax : null },
        { label: 'Heffing op hoge meerwaarden', bedrag: res.surtaxe > 0 ? -res.surtaxe : null },
        { label: 'Verkoopkosten', bedrag: res.verkoopkosten > 0 ? -res.verkoopkosten : null }
    ];
    return rijen;
}

/**
 * Effect per verfijning, in euro's. null betekent: de kern levert er geen
 * getal voor, en dan toont de schil geen bedrag. Er wordt hier niets ingevuld.
 */
export function effecten(ui) {
    const leeg = {
        eersteWoning: null, kortingHonorarium: null, makelaarKoop: null,
        fiscaalBuiten: null, verzekerdBuiten: null, gemeubileerdReel: null,
        aktes: null, verbouwd: null, makelaarVerk: null, verkoopkosten: null
    };
    if (!dmtoData) return leeg;
    const invoer = naarKern(ui);
    if (kern.valideer(invoer, dmtoData).length > 0) return leeg;

    /* De kern geeft maximaal drie gevoeligheden, elk met een stabiele sleutel.
     * Alleen waar een verfijning daarop aansluit, komt er een bedrag te staan. */
    const perSleutel = {};
    for (const g of kern.berekenGevoeligheden(invoer, dmtoData)) {
        perSleutel[g.sleutel] = g.delta;
    }
    return { ...leeg, eersteWoning: perSleutel.primo ?? null };
}
