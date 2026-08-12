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
let bronnenData = null;

async function haal(pad, controle) {
    const antwoord = await fetch(pad);
    if (!antwoord.ok) throw new Error(`${pad}: HTTP ${antwoord.status}`);
    const data = await antwoord.json();
    controle(data);
    return data;
}

/** Laadt dmto.json en bronnen.json één keer. Gooit als het niet lukt. */
export async function laadTarieven(pad = 'dmto.json', bronnenPad = 'bronnen.json') {
    if (dmtoData && bronnenData) return dmtoData;
    [dmtoData, bronnenData] = await Promise.all([
        haal(pad, (d) => {
            if (!d || !d._meta || !d.departementen) throw new Error('dmto.json mist _meta of departementen');
        }),
        haal(bronnenPad, (d) => {
            if (!d || !d._meta || !d.posten) throw new Error('bronnen.json mist _meta of posten');
        })
    ]);
    return dmtoData;
}

/** Voor gebruik buiten de browser, bijvoorbeeld in de testset. */
export function zetTarieven(data, bronnen) {
    dmtoData = data;
    /* Het weglaten van het tweede argument laat de bronnen staan; hem
     * uitdrukkelijk op null zetten wist ze. Dat onderscheid is nodig omdat een
     * ontbrekend bronnenbestand geen lege verantwoording mag opleveren die er
     * uitziet alsof er niets te verantwoorden valt. */
    if (bronnen !== undefined) bronnenData = bronnen;
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

/**
 * Peildatum, bron en houdbaarheid, uit het bestand. Nooit uit de code.
 * vandaagISO is een parameter zodat de testset een vaste datum kan geven.
 */
export function laadMeta(vandaagISO) {
    if (!dmtoData) return { peildatum: null, bron: null, bronUrl: null, status: null, maandenOud: null };
    const vandaag = vandaagISO || new Date().toISOString().slice(0, 10);
    return {
        peildatum: nederlandseDatum(dmtoData._meta.peildatum),
        peildatumISO: dmtoData._meta.peildatum,
        bron: dmtoData._meta.uitgever,
        bronUrl: dmtoData._meta.bron,
        status: kern.houdbaarheid(dmtoData._meta.peildatum, vandaag),
        maandenOud: kern.maandenTussen(dmtoData._meta.peildatum, vandaag)
    };
}

/* ── De vertaaltabel ───────────────────────────────────────────────────── */

const getal = (v) => {
    if (v == null || v === '') return null;
    const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    return s === '' ? null : Number(s);
};

const onbekend = (weetNiet, sleutel) => Boolean(weetNiet && weetNiet[sleutel]);

/**
 * Een postbedrag. Onaangeroerd en expliciet onbekend zijn twee verschillende
 * dingen: alleen een klik op "weet ik niet" maakt de post onbekend, en dat is
 * wat de melding oproept dat de uitkomst onvolledig is. Een veld dat de
 * gebruiker gewoon heeft laten staan telt als nul en zegt niets.
 */
const post = (ui, sleutel) => {
    if (onbekend(ui.weetNiet, sleutel)) return null;
    const waarde = getal(ui[sleutel]);
    return waarde === null ? 0 : waarde;
};

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
            posten: postenKoper(res),
            inKoopsom: inKoopsomBegrepen(res)
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

/* Waar een post vandaan komt. De interface zet dit als bijschrift onder het
 * label, zodat te zien is wat vastligt en wat niet. Twee posten met bijna
 * dezelfde naam, waarvan de ene een tarief is en de andere een schatting,
 * horen niet zonder onderscheid onder elkaar te staan. */
export const SOORT_TEKST = {
    wettelijk: 'wettelijk tarief',
    schatting: 'schatting, geen tarief',
    afspraak: 'afspraak met de notaris',
    opgave: 'uw opgave'
};

function postenKoper(res) {
    const spec = res.notarisSpecificatie;
    if (!spec) {
        return [
            { label: 'Overdrachtsbelasting', soort: 'wettelijk', bedrag: null, bronId: kern.BRON.dmtoDepartementaal },
            { label: 'Notarishonorarium', soort: 'wettelijk', bedrag: null, bronId: kern.BRON.emolumenten },
            { label: 'Btw over het honorarium', soort: 'wettelijk', bedrag: null, bronId: kern.BRON.btw },
            { label: 'Contribution de sécurité immobilière', soort: 'wettelijk', bedrag: null, bronId: kern.BRON.csi },
            { label: 'Débours: uittreksels, kadaster en formaliteiten', soort: 'schatting', bedrag: null, bronId: kern.BRON.debours }
        ];
    }

    /* Deze posten tellen op tot wat er bovenop de koopsom komt; de koopsom zelf
     * staat er dus niet bij. Het honorarium staat hier bruto, met de korting
     * als eigen regel erachter en de btw daar weer achter, want die valt lager
     * uit door de korting. Zou het honorarium hier netto staan, dan telde de
     * korting tweemaal mee en klopte de som niet met het totaal. */
    const rijen = [
        { label: 'Overdrachtsbelasting', soort: 'wettelijk', bedrag: spec.overdrachtsbelasting, bronId: spec.bronnen.overdrachtsbelasting },
        { label: 'Notarishonorarium', soort: 'wettelijk', bedrag: spec.emolumentenBruto, bronId: spec.bronnen.emolumenten }
    ];
    if (spec.korting > 0) {
        rijen.push({ label: 'Korting op het honorarium', soort: 'afspraak', bedrag: -spec.korting, bronId: spec.bronnen.korting });
    }
    rijen.push(
        { label: 'Btw over het honorarium', soort: 'wettelijk', bedrag: spec.tva, bronId: spec.bronnen.tva },
        { label: 'Contribution de sécurité immobilière', soort: 'wettelijk', bedrag: spec.csi, bronId: spec.bronnen.csi },
        { label: 'Débours: uittreksels, kadaster en formaliteiten', soort: 'schatting', bedrag: spec.debours, bronId: spec.bronnen.debours }
    );
    return rijen;
}

/**
 * Posten die de koper wel betaalt maar die al in de koopsom zitten, en dus niet
 * bovenop komen. Bij charge acquereur rekent het model de opgegeven koopsom als
 * prijs inclusief courtage: de grondslag van de notaris is die koopsom min de
 * courtage. De courtage in de lijst hierboven opnemen zou hem dubbel tellen.
 */
function inKoopsomBegrepen(res) {
    if (res.kanten.aankoop.optie !== 'acquereur' || !(res.makelaarsKostenAankoop > 0)) return [];
    /* Geen bron-id: dit is het bedrag dat de gebruiker zelf opgeeft, geen
     * tarief en geen regel. Zie VRIJGESTELD_VAN_BRON in test.mjs. */
    return [{ label: 'Makelaarscourtage', soort: 'opgave', bedrag: res.makelaarsKostenAankoop, bronId: null }];
}

function postenVerkoper(res) {
    return [
        /* De verkoopprijs is de opgave van de gebruiker, geen tarief. */
        { label: 'Verkoopprijs', soort: 'opgave', bedrag: res.nettoVerkoperBasis + res.makelaarsKostenVerkoop, bronId: null },
        { label: 'Makelaarscourtage', soort: 'opgave', bedrag: res.makelaarsKostenVerkoop > 0 ? -res.makelaarsKostenVerkoop : null, bronId: kern.BRON.pvVerkoopkosten },
        { label: 'Meerwaardebelasting en sociale heffingen', soort: 'wettelijk', bedrag: res.plusValueTax > 0 ? -res.plusValueTax : null, bronId: kern.BRON.pvTarieven },
        { label: 'Heffing op hoge meerwaarden', soort: 'wettelijk', bedrag: res.surtaxe > 0 ? -res.surtaxe : null, bronId: kern.BRON.pvSurtaxe },
        { label: 'Verkoopkosten', soort: 'opgave', bedrag: res.verkoopkosten > 0 ? -res.verkoopkosten : null, bronId: kern.BRON.pvVerkoopkosten }
    ];
}

/* ── Verantwoording ────────────────────────────────────────────────────── */

/* Sommige regels bepalen de uitkomst zonder een eigen regel in de opbouw te
 * krijgen: de gemeentelijke opslag zit in het overdrachtsbelastingbedrag, het
 * abattement zit in de belastbare meerwaarde. Ze horen wel verantwoord te
 * worden, en dan met een naam die een lezer herkent. Een id als
 * "pv.forfait.werkzaamheden" is een sleutel, geen label. De labels staan hier
 * en niet in bronnen.json: dat bestand gaat over de grondslag en de bron, deze
 * laag gaat over de woorden waarin de schil het toont. */
export const REGEL_LABEL = {
    [kern.BRON.dmtoCommunaal]: 'Gemeentelijke opslag en inningskosten',
    [kern.BRON.pvAbattement]: 'Aftrek voor bezitsduur',
    [kern.BRON.pvDeRuyter]: 'Verlaagde sociale lasten (arrest De Ruyter)',
    [kern.BRON.pvVerkrijgingOmNiet]: 'Verkrijging om niet: waarde uit de aangifte',
    [kern.BRON.pvForfaitAankoopkosten]: 'Forfait voor de aankoopkosten',
    [kern.BRON.pvWerkelijkeAankoopkosten]: 'Werkelijke aankoopkosten',
    [kern.BRON.pvForfaitWerkzaamheden]: 'Forfait voor werkzaamheden',
    [kern.BRON.pvVerkoopkosten]: 'Aftrekbare verkoopkosten',
    [kern.BRON.pvLmnp]: 'Terugname van afschrijvingen bij gemeubileerde verhuur',
    [kern.BRON.pvNietIngezetene]: 'Heffing bij niet-ingezetenen'
};

/**
 * De lijst waarop de gebruiker kan nazien waarop zijn uitkomst berust: per post
 * en per toegepaste regel de grondslag, de bron en of die tegen de primaire
 * bron is gelegd. Alle tekst komt uit bronnen.json; hier staat er geen.
 *
 * Een post zonder bron-id is een opgave van de gebruiker zelf, geen tarief en
 * geen regel. Die verschijnt niet in dit paneel maar blijft wel in de opbouw.
 */
export function verantwoording(uitkomst) {
    if (!bronnenData || !uitkomst || !uitkomst.res) return [];
    const res = uitkomst.res;
    const rijen = [];

    const voegToe = (blok, postnaam, bedrag, bronId) => {
        const bron = bronnenData.posten[bronId];
        if (!bron) return;
        rijen.push({
            blok,
            bronId,
            post: postnaam,
            bedrag,
            grondslag: bron.grondslag,
            bronnaam: bron.bronnaam || null,
            bronUrl: bron.bronUrl || null,
            status: bron.status,
            opmerking: bron.opmerking || null
        });
    };

    /* Een post zonder bedrag heeft de uitkomst niet bewogen. Hem hier tussen
     * de bedragen zetten leest als een kostenpost die er niet is. Blijft de
     * regel wel van toepassing, dan komt hij verderop onder de toegepaste
     * regels te staan, waar geen bedrag ook geen tegenspraak is. */
    const metBedrag = (p) => p.bedrag !== null && p.bedrag !== 0;

    /* De rol bepaalt welke blokken er staan, niet of er toevallig een bedrag
     * uitkomt. Wie alleen koopt, hoort geen verkoperskosten te verantwoorden
     * te krijgen: dat is de rekening van iemand anders. */
    const rol = uitkomst.invoer.rol;
    if (rol !== 'verkopen') {
        for (const p of uitkomst.koper.posten.filter(metBedrag)) voegToe('Kosten koper', p.label, p.bedrag, p.bronId);
        for (const p of uitkomst.koper.inKoopsom.filter(metBedrag)) voegToe('Kosten koper', p.label, p.bedrag, p.bronId);
    }
    if (rol !== 'kopen' && res.pvReden !== 'vrijstelling hoofdverblijf') {
        for (const p of uitkomst.verkoper.posten.filter(metBedrag)) voegToe('Kosten verkoper', p.label, p.bedrag, p.bronId);
    }
    /* Regels zonder eigen post in de opbouw: geen bedrag, wel verantwoording.
     * Staat de bron al onder een bedrag, dan voegt herhaling niets toe. */
    const alGetoond = new Set(rijen.map((r) => r.bronId));
    for (const bronId of res.toegepasteRegels) {
        if (alGetoond.has(bronId)) continue;
        voegToe('Toegepaste regels', REGEL_LABEL[bronId] || null, null, bronId);
    }

    /* Dezelfde bron kan door meer dan een post worden aangeroepen; hem tweemaal
     * tonen voegt niets toe. */
    const gezien = new Set();
    return rijen.filter((r) => {
        const sleutel = `${r.blok}|${r.bronId}`;
        if (gezien.has(sleutel)) return false;
        gezien.add(sleutel);
        return true;
    });
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
