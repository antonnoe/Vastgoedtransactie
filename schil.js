/* Vastgoedtransactie Analyse — presentatielaag.
 *
 * Vertaald uit schil/Rekentool_Frankrijk.dc.html. De sjabloontaal van Claude
 * Design (`<sc-if>`, `<sc-for>`, `{{ }}`, `onClick="{{ }}"`, `style-focus=`) is
 * vervangen door gewone HTML, CSS en JavaScript; de flow, de teksten en de
 * veldnamen zijn ongewijzigd overgenomen.
 *
 * Deze laag bevat geen enkel tarief, percentage, bedrag of peildatum. Alle
 * bedragen komen via kernadapter.js uit de rekenkern, de peildatum uit
 * dmto.json.
 */

import * as adapter from './kernadapter.js';

/* Doeladres van de hoogtemelding. Moet exact overeenkomen met het adres waar
 * het artikel op draait, inclusief protocol en eventueel www, anders gooit de
 * browser het bericht stil weg. */
const DOEL = 'https://infofrankrijk.com';

/* ── Toestand ──────────────────────────────────────────────────────────── */

const leeg = () => ({
    postcode: '', koopsom: '', type: null, hoofdverblijf: null, bouwgrond: null,
    verkoopprijs: '', verkrijging: null, aankoopprijs: '', datumVerkrijging: '', datumVerkoop: '',
    landmeter: '', diagnostics: '', doorhaling: '', aantalVerkopers: 1,
    verkrijgingskosten: '', aktesBedrag: '', verbouwdBedrag: '',
    mkKoopPartij: null, mkKoopModus: 'percentage', mkKoopWaarde: '',
    mkVerkPartij: null, mkVerkModus: 'percentage', mkVerkWaarde: ''
});

const state = {
    route: null,
    stap: 0,
    antwoorden: leeg(),
    weetNiet: {},
    verfijning: {},
    info: {},
    opbouwOpen: false,
    tarievenGeladen: false
};

/* De verfijningen, letterlijk uit het ontwerp. */
const VERFIJNINGEN_KOPER = [
    { id: 'eersteWoning', label: 'Ik koop voor het eerst een eigen woning', uitleg: 'Bedoeld voor wie nu voor het eerst een woning koopt om zelf in te wonen. In sommige departementen scheelt dat in de overdrachtsbelasting. Hebt u eerder al een eigen woning gehad, dan geldt dit niet.' },
    { id: 'makelaarKoop', label: 'Er is een makelaar bij de aankoop', uitleg: 'In de opdracht aan de makelaar staat wie de courtage betaalt: de koper of de verkoper. Staat het bedrag ten laste van de koper, dan hoort het bij uw totale aankoopkosten. Kijk het na in de opdracht of vraag het aan de makelaar.' },
    { id: 'kortingHonorarium', label: 'Ik vraag de wettelijke korting op het notarishonorarium', uitleg: 'De notaris mag u binnen wettelijke grenzen een korting geven op zijn eigen honorarium, boven een bepaalde koopsom. Belasting en verschotten vallen daar niet onder. U moet er zelf om vragen, vóór de akte. Zet u hem aan, dan rekent de tool met het wettelijke maximum: het gunstigste geval, niet het waarschijnlijkste.' }
];

const VERFIJNINGEN_VERKOPER = [
    { id: 'fiscaalBuiten', label: 'Ik woon fiscaal buiten Frankrijk', uitleg: 'Bent u voor de belasting geen inwoner van Frankrijk, dan geldt een ander regime voor de meerwaarde, met eigen vrijstellingen en een fiscaal vertegenwoordiger bij hogere bedragen. Uw bedrag hierboven verandert er niet door. Laat uw situatie nakijken.' },
    { id: 'verzekerdBuiten', label: 'Ik ben voor ziektekosten verzekerd buiten Frankrijk', uitleg: 'Woont of verzekert u zich buiten Frankrijk voor ziektekosten, dan kan een deel van de heffingen op de meerwaarde anders uitpakken. U toont dat aan met een verklaring van uw verzekeraar. Twijfelt u, laat dit dan uit.' },
    { id: 'gemeubileerdReel', label: 'De woning was gemeubileerd verhuurd onder het reële stelsel', uitleg: 'Bij gemeubileerde verhuur onder het reële stelsel is er in de boekhouding vaak op het pand afgeschreven. Dat kan de meerwaarde bij verkoop anders laten uitvallen dan deze tool laat zien. Vraag uw boekhouder om de cijfers.' },
    { id: 'aktes', label: 'Ik heb de akte en de facturen van toen nog', uitleg: 'Met de oude akte en facturen mag u de destijds gemaakte kosten meetellen bij uw aankoopprijs. Dat verlaagt de meerwaarde. Zonder bewijsstukken geldt vaak een vast forfait.' },
    { id: 'verbouwd', label: 'Ik heb laten verbouwen door een bedrijf, met facturen', uitleg: 'Werk dat door een erkend bedrijf is uitgevoerd en gefactureerd, mag onder voorwaarden bij de aankoopprijs worden opgeteld. Zelf geklust of zwart betaald telt niet mee. Bewaar de facturen op naam van de eigenaar.' },
    { id: 'makelaarVerk', label: 'Er is een makelaar bij de verkoop', uitleg: 'In de verkoopopdracht staat wie de courtage betaalt en hoe hoog die is: een percentage van de prijs of een vast bedrag. Betaalt u die als verkoper, dan gaat hij van uw opbrengst af. Neem het over zoals het in de opdracht staat.' },
    { id: 'verkoopkosten', label: 'Ik maak verkoopkosten (landmeter, keuringen, doorhaling)', uitleg: 'Denk aan de landmeter, de verplichte keuringen van de woning en het doorhalen van een oude hypotheek. Die kosten gaan van uw opbrengst af. Weet u een bedrag niet, kies dan "weet ik niet" — de post blijft dan buiten de berekening.' }
];

/* ── Flow ──────────────────────────────────────────────────────────────── */

function flow() {
    const a = state.antwoorden;
    const koper = ['k1', 'k2', 'k3'];
    const verk = a.hoofdverblijf === 'ja' ? ['v0'] : ['v0', 'vB', 'v1', 'v2', 'v3', 'v4'];
    if (state.route === 'koper') return ['rol'].concat(koper, ['res']);
    if (state.route === 'verkoper') return ['rol'].concat(verk, ['res']);
    if (state.route === 'beide') return ['rol'].concat(koper, ['kres'], verk, ['res']);
    return ['rol'];
}

function huidig() {
    const f = flow();
    return f[Math.min(state.stap, f.length - 1)];
}

/* ── Hulp ──────────────────────────────────────────────────────────────── */

const cijfers = (s) => String(s || '').replace(/[^0-9]/g, '');
const formatBedrag = (s) => {
    const c = cijfers(s);
    return c ? Number(c).toLocaleString('nl-NL') : '';
};
const euro = (n) => (n == null ? '—' : `${n < 0 ? '− ' : ''}€ ${Math.round(Math.abs(n)).toLocaleString('nl-NL')}`);

const el = (kies) => document.querySelector(kies);
const alle = (kies) => Array.from(document.querySelectorAll(kies));
const toonEl = (node, aan) => { if (node) node.classList.toggle('verborgen', !aan); };

/* Voert de doorgangscontrole per scherm uit. Staat los van valideer() uit de
 * kern: die bepaalt of er een uitkomst getoond mag worden, deze of de gebruiker
 * naar de volgende vraag mag. */
function klaar() {
    const a = state.antwoorden;
    switch (huidig()) {
        case 'rol': return Boolean(state.route);
        case 'k1': return cijfers(a.postcode).length === 5 && Boolean(adapter.kentPostcode(a.postcode));
        case 'k2': return cijfers(a.koopsom).length > 0 && Number(cijfers(a.koopsom)) > 0;
        case 'k3': return Boolean(a.type);
        case 'v0': return Boolean(a.hoofdverblijf);
        case 'vB': return Boolean(a.bouwgrond);
        case 'v1': return cijfers(a.verkoopprijs).length > 0 && Number(cijfers(a.verkoopprijs)) > 0;
        case 'v2': return Boolean(a.verkrijging);
        case 'v3': {
            if (cijfers(a.aankoopprijs).length === 0) return false;
            const erf = a.verkrijging === 'geerfd' || a.verkrijging === 'geschonken';
            return !erf || Boolean(state.weetNiet.verkrijgingskosten) || cijfers(a.verkrijgingskosten).length > 0;
        }
        case 'v4': return Boolean(a.datumVerkrijging) && Boolean(a.datumVerkoop)
            && a.datumVerkoop >= a.datumVerkrijging;
        default: return true;
    }
}

function ga(delta) {
    const f = flow();
    state.stap = Math.max(0, Math.min(f.length - 1, state.stap + delta));
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Invoer ────────────────────────────────────────────────────────────── */

const BEDRAGVELDEN = ['koopsom', 'verkoopprijs', 'aankoopprijs', 'verkrijgingskosten',
    'aktesBedrag', 'verbouwdBedrag', 'landmeter', 'diagnostics', 'doorhaling'];

function koppelInvoer() {
    for (const naam of BEDRAGVELDEN) {
        const veld = document.querySelector(`[name="${naam}"]`);
        if (veld) {
            veld.addEventListener('input', () => {
                state.antwoorden[naam] = formatBedrag(veld.value);
                veld.value = state.antwoorden[naam];
                render();
            });
        }
    }
    const postcode = document.querySelector('[name="postcode"]');
    postcode.addEventListener('input', () => {
        state.antwoorden.postcode = postcode.value.replace(/[^0-9]/g, '').slice(0, 5);
        postcode.value = state.antwoorden.postcode;
        render();
    });
    for (const naam of ['datumVerkrijging', 'datumVerkoop']) {
        const veld = document.querySelector(`[name="${naam}"]`);
        veld.addEventListener('input', () => { state.antwoorden[naam] = veld.value; render(); });
    }
    for (const [naam, modusVeld] of [['mkKoopWaarde', 'mkKoopModus'], ['mkVerkWaarde', 'mkVerkModus']]) {
        const veld = document.querySelector(`[name="${naam}"]`);
        veld.addEventListener('input', () => {
            const rauw = veld.value;
            state.antwoorden[naam] = state.antwoorden[modusVeld] === 'bedrag'
                ? formatBedrag(rauw)
                : rauw.replace(/[^0-9,.]/g, '').slice(0, 6);
            veld.value = state.antwoorden[naam];
            render();
        });
    }
}

/* ── Klikken ───────────────────────────────────────────────────────────── */

const STAPVELDEN = ['rol', 'type', 'hoofdverblijf', 'verkrijging', 'bouwgrond'];

function koppelKlik() {
    document.addEventListener('click', (e) => {
        const keuze = e.target.closest('[data-waarde]');
        if (keuze) {
            const veld = keuze.dataset.veld;
            if (veld === 'rol') {
                state.route = keuze.dataset.waarde;
            } else {
                state.antwoorden[veld] = keuze.dataset.waarde;
            }
            render();
            if (STAPVELDEN.includes(veld)) setTimeout(() => ga(1), 180);
            return;
        }

        const info = e.target.closest('[data-info]');
        if (info) {
            const k = info.dataset.info;
            state.info[k] = !state.info[k];
            render();
            return;
        }

        const weetniet = e.target.closest('[data-weetniet]');
        if (weetniet) {
            const k = weetniet.dataset.weetniet;
            state.weetNiet[k] = !state.weetNiet[k];
            if (state.weetNiet[k]) state.antwoorden[k] = '';
            render();
            return;
        }

        const actie = e.target.closest('[data-actie]');
        if (!actie) return;
        const a = actie.dataset.actie;

        if (a === 'verder') { if (klaar()) ga(1); return; }
        if (a === 'terug') { ga(-1); return; }
        if (a === 'opbouw') { state.opbouwOpen = !state.opbouwOpen; render(); return; }
        if (a === 'herstart') {
            Object.assign(state, {
                route: null, stap: 0, antwoorden: leeg(),
                verfijning: {}, weetNiet: {}, info: {}, opbouwOpen: false
            });
            render();
            return;
        }
        if (a.startsWith('aantal:')) {
            const d = a.slice(7) === '+' ? 1 : -1;
            state.antwoorden.aantalVerkopers =
                Math.max(1, Math.min(20, (state.antwoorden.aantalVerkopers || 1) + d));
            render();
            return;
        }
        if (a.startsWith('verfijn:')) {
            const k = a.slice(8);
            state.verfijning[k] = !state.verfijning[k];
            render();
            return;
        }
        if (a.startsWith('vinfo:')) {
            const k = a.slice(6);
            state.info[k] = !state.info[k];
            render();
        }
    });
}

/* ── URL ───────────────────────────────────────────────────────────────── */

/* De invoer van de schil wordt via de adapter naar kernvelden vertaald en dan
 * door de kern gecodeerd, zodat er maar één definitie van de URL bestaat. */
function naarUrl() {
    if (!state.route) return;
    try {
        const query = adapter.naarQuery(uiObject());
        const extra = new URLSearchParams(query);
        extra.set('r', state.route);
        extra.set('s', String(state.stap));
        window.history.replaceState(null, '', `?${extra.toString()}`);
    } catch (err) {
        /* Deelbaarheid is een extraatje; in een sandboxed iframe mag dit falen. */
    }
}

function uitUrl() {
    let params;
    try {
        params = new URLSearchParams(window.location.search);
    } catch (err) {
        return;
    }
    if (!params.get('r')) return;
    state.route = params.get('r');
    const ui = adapter.uitQuery(params.toString());
    Object.assign(state.antwoorden, ui.antwoorden);
    Object.assign(state.verfijning, ui.verfijning);
    Object.assign(state.weetNiet, ui.weetNiet);
    const stap = Number(params.get('s'));
    if (Number.isFinite(stap)) state.stap = Math.max(0, stap);
}

/* ── Hoogte melden ─────────────────────────────────────────────────────── */

let laatsteHoogte = 0;
function meldHoogte() {
    if (window.parent === window) return;
    const wrap = el('.rekentool');
    const hoogte = Math.ceil((wrap ? wrap.getBoundingClientRect().height : document.body.scrollHeight) + 2);
    if (hoogte === laatsteHoogte) return;
    laatsteHoogte = hoogte;
    try {
        window.parent.postMessage({ type: 'if-tool-hoogte', hoogte }, DOEL);
    } catch (err) {
        /* Geen bereikbaar bovenliggend venster. */
    }
}

/* ── Renderen ──────────────────────────────────────────────────────────── */

function uiObject() {
    return {
        ...state.antwoorden,
        rol: state.route,
        weetNiet: state.weetNiet,
        verfijning: state.verfijning
    };
}

function zetTekst(sleutel, waarde) {
    for (const node of alle(`[data-tekst="${sleutel}"]`)) node.textContent = waarde;
}

function rijLijst(container, rijen) {
    container.replaceChildren();
    for (const rij of rijen) {
        const r = document.createElement('div');
        r.className = 'post';
        const l = document.createElement('span');
        l.textContent = rij.label;
        /* Zichtbaar maken wat een tarief is en wat een schatting: twee posten
         * met bijna dezelfde naam mogen niet als gelijkwaardig lezen. */
        if (rij.soort) {
            const soort = document.createElement('span');
            soort.className = 'post-soort';
            soort.textContent = adapter.SOORT_TEKST[rij.soort] || rij.soort;
            l.append(document.createElement('br'), soort);
        }
        const b = document.createElement('span');
        b.className = 'bedrag';
        b.textContent = rij.bedrag;
        r.append(l, b);
        container.append(r);
    }
}

function verfijningLijst(container, definities, effecten) {
    container.replaceChildren();
    for (const def of definities) {
        const aan = Boolean(state.verfijning[def.id]);
        const effect = effecten[def.id];

        const wrap = document.createElement('div');
        wrap.className = 'verfijning';

        const regel = document.createElement('div');
        regel.className = 'verfijning-regel';

        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'verfijning-knop';
        knop.dataset.actie = `verfijn:${def.id}`;
        knop.setAttribute('aria-pressed', aan ? 'true' : 'false');
        const label = document.createElement('span');
        label.textContent = def.label;
        const bedrag = document.createElement('span');
        bedrag.className = 'verfijning-effect';
        if (effect != null) {
            bedrag.classList.add('heeft-bedrag');
            bedrag.textContent = (effect < 0 ? '− ' : '+ ') + euro(Math.abs(effect)).replace('− ', '');
        } else {
            bedrag.textContent = aan ? 'Aan' : 'Aanzetten';
        }
        knop.append(label, bedrag);

        const infoKnop = document.createElement('button');
        infoKnop.type = 'button';
        infoKnop.className = 'info-knop';
        infoKnop.dataset.actie = `vinfo:${def.id}`;
        infoKnop.setAttribute('aria-label', `Uitleg bij: ${def.label}`);
        infoKnop.setAttribute('aria-expanded', state.info[def.id] ? 'true' : 'false');
        infoKnop.textContent = 'i';

        regel.append(knop, infoKnop);
        wrap.append(regel);

        if (state.info[def.id]) {
            const uitleg = document.createElement('div');
            uitleg.className = 'notitie';
            uitleg.setAttribute('role', 'note');
            uitleg.textContent = def.uitleg;
            wrap.append(uitleg);
        }
        container.append(wrap);
    }
}

function render() {
    const a = state.antwoorden;
    const nu = huidig();
    const f = flow();
    const vragen = f.filter((x) => x !== 'res' && x !== 'kres' && x !== 'rol');
    const idx = vragen.indexOf(nu);
    const isRes = nu === 'res' || nu === 'kres';

    toonEl(el('[data-toon="geenTarieven"]'), !state.tarievenGeladen);

    /* Schermen */
    for (const sectie of alle('[data-scherm]')) {
        const naam = sectie.dataset.scherm;
        toonEl(sectie, naam === 'uitkomst' ? isRes : naam === nu);
    }

    /* Voortgang */
    toonEl(el('[data-toon="voortgang"]'), !isRes && nu !== 'rol');
    zetTekst('stapNr', String(idx + 1));
    zetTekst('stapTotaal', String(vragen.length));
    const balk = el('[data-breedte="pct"]');
    if (balk) balk.style.width = `${Math.round(((idx + 1) / Math.max(1, vragen.length)) * 100)}%`;

    /* Keuzeknoppen */
    for (const knop of alle('[data-waarde]')) {
        const veld = knop.dataset.veld;
        const aan = veld === 'rol' ? state.route === knop.dataset.waarde : a[veld] === knop.dataset.waarde;
        knop.setAttribute('aria-pressed', aan ? 'true' : 'false');
    }

    /* Invoervelden */
    for (const naam of BEDRAGVELDEN.concat(['postcode', 'datumVerkrijging', 'datumVerkoop', 'mkKoopWaarde', 'mkVerkWaarde'])) {
        const veld = document.querySelector(`[name="${naam}"]`);
        if (veld && veld.value !== a[naam]) veld.value = a[naam] || '';
    }
    const aantal = document.querySelector('[name="aantalVerkopers"]');
    if (aantal) aantal.value = String(a.aantalVerkopers || 1);

    for (const knop of alle('[data-weetniet]')) {
        const k = knop.dataset.weetniet;
        knop.setAttribute('aria-pressed', state.weetNiet[k] ? 'true' : 'false');
        const veld = document.querySelector(`[name="${k}"]`);
        if (veld) veld.disabled = Boolean(state.weetNiet[k]);
    }

    /* Uitleg-notities */
    for (const notitie of alle('[data-notitie]')) {
        toonEl(notitie, Boolean(state.info[notitie.dataset.notitie]));
    }
    for (const knop of alle('[data-info]')) {
        knop.setAttribute('aria-expanded', state.info[knop.dataset.info] ? 'true' : 'false');
    }

    /* Scherm v3: verkrijgingskosten en de waarschuwing daarbij */
    const erfschenk = a.verkrijging === 'geerfd' || a.verkrijging === 'geschonken';
    toonEl(el('[data-toon="verkrijgingskosten"]'), erfschenk);
    toonEl(el('[data-toon="waarschuwingVerkrijging"]'), erfschenk);
    zetTekst('vraagAankoopprijs', a.verkrijging === 'gekocht'
        ? 'Voor welk bedrag hebt u het gekocht?'
        : 'Wat was de waarde bij verkrijging?');
    zetTekst('labelAankoopprijs', a.verkrijging === 'gekocht'
        ? 'Aankoopprijs destijds'
        : 'Waarde bij verkrijging');

    /* Meldingen bij de doorgangscontrole */
    zetTekst('postcodeMelding',
        (cijfers(a.postcode).length === 5 && !adapter.kentPostcode(a.postcode))
            ? 'Het tarief voor dit gebied staat niet in de tabel van de belastingdienst. Er wordt niet met een terugvaltarief gerekend.'
            : '');
    zetTekst('datumMelding',
        (a.datumVerkrijging && a.datumVerkoop && a.datumVerkoop < a.datumVerkrijging)
            ? 'De verkoopdatum ligt vóór de datum van verkrijging.'
            : '');

    /* Verder-knop */
    const keuzeScherm = nu === 'k3' || nu === 'v0' || nu === 'vB' || nu === 'v2';
    const verderKnop = el('[data-toon="verderKnop"]');
    toonEl(verderKnop, !isRes && nu !== 'rol' && !keuzeScherm);
    if (verderKnop) {
        verderKnop.disabled = !klaar();
        zetTekst('verderLabel', (nu === 'k3' || nu === 'v4') ? 'Toon mijn bedrag' : 'Verder');
    }

    /* Zichtbaarheid binnen de verfijningen */
    toonEl(el('[data-toon="makelaarKoop"]'), Boolean(state.verfijning.makelaarKoop));
    toonEl(el('[data-toon="makelaarVerk"]'), Boolean(state.verfijning.makelaarVerk));
    toonEl(el('[data-toon="mkKoopBedrag"]'), Boolean(a.mkKoopPartij) && a.mkKoopPartij !== 'geen');
    toonEl(el('[data-toon="mkVerkBedrag"]'), Boolean(a.mkVerkPartij) && a.mkVerkPartij !== 'geen');
    toonEl(el('[data-toon="aktesBedrag"]'), Boolean(state.verfijning.aktes));
    toonEl(el('[data-toon="verbouwdBedrag"]'), Boolean(state.verfijning.verbouwd));
    zetTekst('mkKoopTeken', a.mkKoopModus === 'bedrag' ? '€' : '%');
    zetTekst('mkVerkTeken', a.mkVerkModus === 'bedrag' ? '€' : '%');
    const mkKoopVeld = document.querySelector('[name="mkKoopWaarde"]');
    if (mkKoopVeld) mkKoopVeld.placeholder = a.mkKoopModus === 'bedrag' ? '12.000' : '4,5';
    const mkVerkVeld = document.querySelector('[name="mkVerkWaarde"]');
    if (mkVerkVeld) mkVerkVeld.placeholder = a.mkVerkModus === 'bedrag' ? '12.000' : '4,5';

    if (!isRes) {
        naarUrl();
        meldHoogte();
        return;
    }

    /* ── De uitkomst ── */
    const ui = uiObject();
    /* Bij de tussenuitkomst in de route beide is alleen de aankoop beantwoord.
     * De verkoopvragen komen daarna pas, dus wordt er hier op de rol koper
     * getoetst; anders zou de kern een verkoopprijs eisen die nog niet gevraagd
     * is. Op de berekening zelf heeft de rol geen invloed. */
    const uiVoorUitkomst = nu === 'kres' ? { ...ui, rol: 'koper' } : ui;
    const uitkomst = state.tarievenGeladen ? adapter.bereken(uiVoorUitkomst) : null;
    const geldig = Boolean(uitkomst && uitkomst.fouten.length === 0);

    const koperKant = state.route === 'koper' || state.route === 'beide';
    const verkoperKant = state.route === 'verkoper' || state.route === 'beide';
    const vrijgesteld = geldig && verkoperKant && uitkomst.verkoper.vrijgesteld;
    const bedragEl = el('[data-tekst="uitkomstBedrag"]');

    let posten = [];
    const koperUitkomst = nu === 'kres' || (isRes && state.route === 'koper');
    if (koperUitkomst) {
        zetTekst('uitkomstZin', a.type === 'nieuwbouw'
            ? 'Bovenop de koopsom kost deze nieuwbouwwoning u in totaal'
            : 'Bovenop de koopsom kost deze aankoop u in totaal');
        zetTekst('uitkomstBedrag', geldig ? euro(uitkomst.koper.bovenopKoopsom) : '—');
        if (bedragEl) bedragEl.classList.remove('groen');
        posten = geldig ? uitkomst.koper.posten : [];
        toonEl(el('[data-toon="tweedeUitkomst"]'), false);
    } else if (vrijgesteld) {
        zetTekst('uitkomstZin', 'Dit was uw hoofdverblijf, dus over de meerwaarde betaalt u');
        zetTekst('uitkomstBedrag', '€ 0');
        if (bedragEl) bedragEl.classList.add('groen');
        toonEl(el('[data-toon="tweedeUitkomst"]'), state.route === 'beide');
        if (state.route === 'beide') {
            zetTekst('tweedeZin', 'En bovenop de koopsom kost uw aankoop u');
            zetTekst('tweedeBedrag', geldig ? euro(uitkomst.koper.bovenopKoopsom) : '—');
        }
    } else {
        zetTekst('uitkomstZin', state.route === 'beide'
            ? 'Van de verkoop houdt u netto over'
            : 'Na belasting en kosten houdt u van deze verkoop over');
        zetTekst('uitkomstBedrag', geldig ? euro(uitkomst.verkoper.bedrag) : '—');
        if (bedragEl) bedragEl.classList.add('groen');
        posten = geldig ? uitkomst.verkoper.posten : [];
        toonEl(el('[data-toon="tweedeUitkomst"]'), state.route === 'beide');
        if (state.route === 'beide') {
            zetTekst('tweedeZin', 'Bovenop de koopsom kost uw aankoop u');
            zetTekst('tweedeBedrag', geldig ? euro(uitkomst.koper.bovenopKoopsom) : '—');
        }
    }

    /* Opbouw */
    toonEl(el('[data-toon="opbouwBlok"]'), !vrijgesteld && posten.length > 0);
    toonEl(el('[data-toon="opbouw"]'), state.opbouwOpen);
    zetTekst('opbouwLabel', state.opbouwOpen ? 'Verberg de opbouw' : 'Bekijk de opbouw');
    zetTekst('opbouwPijl', state.opbouwOpen ? '▾' : '▸');
    const opbouwKnop = el('[data-actie="opbouw"]');
    if (opbouwKnop) opbouwKnop.setAttribute('aria-expanded', state.opbouwOpen ? 'true' : 'false');
    rijLijst(el('[data-lijst="posten"]'), posten.map((p) => ({ label: p.label, soort: p.soort, bedrag: euro(p.bedrag) })));

    /* Wat de koper wel betaalt maar al in de koopsom zit, staat apart: in de
     * lijst hierboven zou het dubbel tellen. */
    const inKoopsom = (geldig && koperUitkomst) ? uitkomst.koper.inKoopsom : [];
    toonEl(el('[data-toon="inKoopsom"]'), inKoopsom.length > 0);
    rijLijst(el('[data-lijst="inKoopsom"]'),
        inKoopsom.map((p) => ({ label: p.label, soort: p.soort, bedrag: euro(p.bedrag) })));

    /* Peildatum en bron, uit dmto.json */
    const meta = adapter.laadMeta();
    zetTekst('peildatum', meta.peildatum || '—');
    zetTekst('bron', meta.bron || '—');

    /* Onvolledigheden. Beide gaan over kosten van de verkoper, dus ze horen
     * alleen op het verkoperscherm; op de tussenuitkomst van de koper in de
     * route beide staan de verkoopvragen nog niet eens gesteld. */
    const verkopersMelding = verkoperKant && nu === 'res';
    const onbekend = (geldig && verkopersMelding) ? uitkomst.onvolledig : [];
    toonEl(el('[data-toon="onvolledig"]'), onbekend.length > 0);
    toonEl(el('[data-toon="verkrijgingOnbekend"]'),
        geldig && verkopersMelding && uitkomst.verkrijgingskostenOnbekend);

    /* Waarschuwingen */
    /* Elke waarschuwing hieronder gaat over de verkoop. */
    const waarschuwingen = [];
    if (geldig && !vrijgesteld && verkopersMelding) {
        if (erfschenk) {
            waarschuwingen.push('Bij een geërfd of geschonken pand rekent deze tool niet alles mee, zoals kosten van de nalatenschap of een verdeling tussen erfgenamen. Laat uw uitkomst nakijken door uw notaris.');
        }
        if ((a.aantalVerkopers || 1) > 1) {
            waarschuwingen.push('U verkoopt met meer dan één eigenaar. De uitkomst hierboven geldt voor de verkoop als geheel; per eigenaar kan het anders uitpakken. Vraag uw notaris om een berekening per persoon.');
        }
        if (state.verfijning.fiscaalBuiten) {
            waarschuwingen.push('U woont fiscaal buiten Frankrijk. Dan geldt een ander regime met eigen vrijstellingen en soms een fiscaal vertegenwoordiger. Deze tool rekent dat niet voor u uit; laat uw situatie nakijken.');
        }
        if (state.verfijning.gemeubileerdReel) {
            waarschuwingen.push('Bij gemeubileerde verhuur onder het reële stelsel is er meestal op het pand afgeschreven. Uw werkelijke meerwaarde kan daardoor hoger zijn dan hierboven staat. Vraag uw boekhouder om de cijfers.');
        }
    }
    if (uitkomst && uitkomst.fouten.length > 0) waarschuwingen.push(...uitkomst.fouten);

    const bak = el('[data-lijst="waarschuwingen"]');
    bak.replaceChildren();
    for (const tekst of waarschuwingen) {
        const blok = document.createElement('div');
        blok.className = 'waarschuwing';
        blok.setAttribute('role', 'note');
        const teken = document.createElement('span');
        teken.className = 'teken';
        teken.setAttribute('aria-hidden', 'true');
        teken.textContent = '!';
        const inhoud = document.createElement('div');
        const kop = document.createElement('strong');
        kop.textContent = 'Let op';
        inhoud.append(kop, document.createElement('br'), document.createTextNode(tekst));
        blok.append(teken, inhoud);
        bak.append(blok);
    }

    /* Verfijningen */
    const effecten = state.tarievenGeladen ? adapter.effecten(ui) : {};
    toonEl(el('[data-toon="koperVerfijningen"]'), koperKant);
    toonEl(el('[data-toon="verkoperVerfijningen"]'), nu === 'res' && verkoperKant && !vrijgesteld);
    toonEl(el('[data-toon="kostenvelden"]'),
        nu === 'res' && verkoperKant && !vrijgesteld && Boolean(state.verfijning.verkoopkosten));
    if (koperKant) verfijningLijst(el('[data-lijst="koperVerfijningen"]'), VERFIJNINGEN_KOPER, effecten);
    if (verkoperKant) verfijningLijst(el('[data-lijst="verkoperVerfijningen"]'), VERFIJNINGEN_VERKOPER, effecten);

    /* Doorknop van de tussenuitkomst naar de verkoopvragen */
    toonEl(el('[data-toon="vervolgKnop"]'), nu === 'kres');

    naarUrl();
    meldHoogte();
}

/* ── Opstarten ─────────────────────────────────────────────────────────── */

koppelInvoer();
koppelKlik();

if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(meldHoogte).observe(el('.rekentool') || document.body);
}
window.addEventListener('load', meldHoogte);

adapter.laadTarieven()
    .then(() => {
        state.tarievenGeladen = true;
        uitUrl();
        render();
    })
    .catch(() => {
        state.tarievenGeladen = false;
        render();
    });

render();
