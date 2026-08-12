/*
 * Testset voor de rekenkern. Draait zonder externe afhankelijkheden:
 *
 *     node test.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
    berekenEmolumenten,
    berekenDmto,
    berekenNotarisAncien,
    berekenNotarisVefa,
    berekenAbattement,
    berekenSurtaxe,
    volleJaren,
    postcodeNaarDepartement,
    zoekDepartement,
    departementaalTarief,
    berekenRemise,
    kiesKostenpost,
    makelaarCourtage,
    koopsomVan,
    makelaarKanten,
    heeftAankoopkostenForfait,
    heeftWerkzaamhedenForfait,
    berekenScenario,
    berekenGevoeligheden,
    jaarLater,
    invoerNaarQuery,
    queryNaarInvoer,
    valideer,
    bepaalSignaleringen,
    SIGNALERINGEN,
    ARTIKEL_URL,
    TERUGNAME_AFSCHRIJVINGEN_VANAF,
    STANDAARD_INVOER,
    URL_VELDEN
} from './calc.js';

import * as adapter from './kernadapter.js';

const hier = dirname(fileURLToPath(import.meta.url));
const dmto = JSON.parse(readFileSync(join(hier, 'dmto.json'), 'utf8'));
const meta = dmto._meta;

const rond = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

let geslaagd = 0;
const mislukt = [];

function check(omschrijving, werkelijk, verwacht) {
    const gelijk = Object.is(werkelijk, verwacht) || werkelijk === verwacht;
    if (gelijk) {
        geslaagd += 1;
        console.log(`  ok   ${omschrijving}`);
    } else {
        mislukt.push(omschrijving);
        console.log(`  FOUT ${omschrijving}\n         verwacht: ${JSON.stringify(verwacht)}\n         werkelijk: ${JSON.stringify(werkelijk)}`);
    }
}

console.log('\nEmolumenten en notariskosten');
// 6500 x 3,870% + 10500 x 1,596% + 43000 x 1,064% + 340000 x 0,799%
check('emolumenten over 400.000 euro is 3.593,25 euro exclusief btw',
    berekenEmolumenten(400000), 3593.25);

// Departementaal 5,00% geeft 20.000 + 4.800 gemeentelijk + 474 frais d'assiette
check('DMTO over 400.000 euro bij 5,00% departementaal is 25.274 euro',
    berekenDmto(400000, 5.00, meta), 25274);

// 3593,25 emolumenten + 718,65 btw + 25.274 DMTO + 400 CSI + 1200 debours.
// Let op: de opdracht noemde 31.191,90, dat is 6,32% x 400.000 = 25.280. De
// componentformule uit taak 2 geeft 6,3185%, dus 25.274. Zie STATUS.md.
check('notariskosten bestaande bouw over 400.000 euro bij 5,00% departementaal is 31.185,90 euro',
    berekenNotarisAncien(400000, 5.00, meta), 31185.90);

// 3593,25 emolumenten + 718,65 btw + 2860 TPF + 400 CSI + 1200 debours
check('notariskosten nieuwbouw over 400.000 euro is 8.771,90 euro',
    berekenNotarisVefa(400000), 8771.90);

console.log('\nControle op de samengestelde DMTO-tarieven uit de bron');
const samengesteld = (dep) => {
    const d = dep + meta.taxe_communale_pct + dep * (meta.frais_assiette_pct_van_departementaal / 100);
    return Math.round(d * 1e4) / 1e4;
};
check('5,00 procent departementaal geeft 6,3185 procent totaal', samengesteld(5.00), 6.3185);
check('4,50 procent departementaal geeft 5,8067 procent totaal', samengesteld(4.50), 5.8067);
check('3,80 procent departementaal geeft 5,0901 procent totaal', samengesteld(3.80), 5.0901);

console.log('\nAbattement voor bezitsduur');
check('abattement bij 21 jaar is 96,0 procent IR', berekenAbattement(21)[0], 96.0);
check('abattement bij 21 jaar is 26,4 procent sociale lasten', berekenAbattement(21)[1], 26.4);
check('abattement bij 22 jaar is 100 procent IR', berekenAbattement(22)[0], 100);
check('abattement bij 22 jaar is 28,0 procent sociale lasten', berekenAbattement(22)[1], 28.0);
check('abattement bij 23 jaar is 100 procent IR', berekenAbattement(23)[0], 100);
check('abattement bij 23 jaar is 37,0 procent sociale lasten', berekenAbattement(23)[1], 37.0);
check('abattement bij 30 jaar is 100 procent sociale lasten', berekenAbattement(30)[1], 100);
check('abattement bij 5 jaar is nul', berekenAbattement(5).join('/'), '0/0');

console.log('\nTaxe sur les plus-values immobilieres elevees (BOFiP BOI-RFPI-TPVIE-20)');
check('meerwaarde van 52.500 euro geeft 675 euro', berekenSurtaxe(52500, 1, false), 675);
check('meerwaarde van 103.400 euro geeft 2.442 euro', berekenSurtaxe(103400, 1, false), 2442);
check('meerwaarde van 50.000 euro geeft nul, drempel niet overschreden',
    berekenSurtaxe(50000, 1, false), 0);
check('99.000 euro over twee verkopers blijft onder de drempel per verkoper',
    berekenSurtaxe(99000, 2, false), 0);
check('99.000 euro bij een enkele verkoper is wel belast',
    berekenSurtaxe(99000, 1, false), 1980);
check('105.000 euro over twee verkopers is tweemaal 52.500 euro, dus 1.350 euro',
    berekenSurtaxe(105000, 2, false), 1350);
check('205.000 euro over twee verkopers geeft tweemaal het bedrag bij 102.500 euro',
    berekenSurtaxe(205000, 2, false), 2 * berekenSurtaxe(102500, 1, false));
check('bouwgrond is uitgesloten', berekenSurtaxe(103400, 1, true), 0);

// De afvlakkingsformules horen elke tranchegrens continu te maken. Wijkt dit
// af, dan is de transcriptie van het barema fout.
console.log('\nContinuiteit van het barema op de tranchegrenzen');
for (const grens of [60000, 100000, 110000, 150000, 160000, 200000, 210000, 250000, 260000]) {
    const links = berekenSurtaxe(grens, 1, false);
    const rechts = berekenSurtaxe(grens + 1, 1, false);
    check(`barema is continu rond ${grens} euro`, Math.abs(rechts - links) <= 1, true);
}

console.log('\nBezitsduur in volle perioden van twaalf maanden');
check('aankoop 15-12-2003, verkoop 10-01-2026 geeft 22 volle jaren',
    volleJaren('2003-12-15', '2026-01-10'), 22);
check('aankoop 15-12-2003, verkoop 15-12-2026 geeft 23 volle jaren',
    volleJaren('2003-12-15', '2026-12-15'), 23);
check('aankoop 15-12-2003, verkoop 14-12-2026 geeft 22 volle jaren',
    volleJaren('2003-12-15', '2026-12-14'), 22);
check('gelijke datum geeft nul jaren', volleJaren('2020-05-05', '2020-05-05'), 0);

console.log('\nPostcode naar departement');
check('20000 is 2A', postcodeNaarDepartement('20000'), '2A');
check('20199 is 2A', postcodeNaarDepartement('20199'), '2A');
check('20200 is 2B', postcodeNaarDepartement('20200'), '2B');
check('20600 is 2B', postcodeNaarDepartement('20600'), '2B');
check('97400 is 974', postcodeNaarDepartement('97400'), '974');
check('97600 is 976 (Mayotte)', postcodeNaarDepartement('97600'), '976');
check('97150 is 971', postcodeNaarDepartement('97150'), '971');
check('58000 is 58', postcodeNaarDepartement('58000'), '58');
check('75001 is 75', postcodeNaarDepartement('75001'), '75');
check('ongeldige postcode geeft null', postcodeNaarDepartement('abc'), null);

console.log('\nOpzoeken in de DGFiP-tabel');
check('Mayotte is bereikbaar en staat op 4,50 procent',
    zoekDepartement(dmto, '97600').std, 4.50);
check('Corsica 20000 levert Corse-du-Sud', zoekDepartement(dmto, '20000').code, '2A');
check('Saint-Pierre-et-Miquelon (97500) staat niet in de tabel',
    zoekDepartement(dmto, '97500'), null);
check('97700 staat niet in de tabel', zoekDepartement(dmto, '97700'), null);
check('Monaco/98000 staat niet in de tabel', zoekDepartement(dmto, '98000'), null);

console.log('\nPrimo-accedant');
check('departement 65 heeft primo 3,80 en standaard 4,50, verschil 0,70 punt',
    departementaalTarief(zoekDepartement(dmto, '65000'), true), 3.80);
check('departement 65 standaard is 4,50',
    departementaalTarief(zoekDepartement(dmto, '65000'), false), 4.50);
check('departement 06 zonder verhoging heeft primo gelijk aan standaard',
    departementaalTarief(zoekDepartement(dmto, '06000'), true),
    departementaalTarief(zoekDepartement(dmto, '06000'), false));
check('departement 58 primo is 4,50',
    departementaalTarief(zoekDepartement(dmto, '58000'), true), 4.50);

console.log('\nIntegriteit van dmto.json');
const codes = Object.keys(dmto.departementen);
check('elk departement heeft naam, std en primo',
    codes.every((c) => {
        const d = dmto.departementen[c];
        return typeof d.naam === 'string' && typeof d.std === 'number' && typeof d.primo === 'number';
    }), true);
check('geen enkel primo-tarief ligt boven het standaardtarief',
    codes.every((c) => dmto.departementen[c].primo <= dmto.departementen[c].std), true);
check('_meta bevat bron en peildatum',
    Boolean(meta.bron && meta.peildatum), true);

console.log('\nKorting op de emolumenten van de notaris (blok C2)');
// Emolumenten over het deel boven 100.000: 3.593,25 min 1.196,25 = 2.397,00
check('korting van 20 procent op 400.000 euro is 479,40 euro',
    berekenRemise(400000, 20), 479.40);
check('geen korting onder de drempel van 100.000 euro',
    berekenRemise(80000, 20), 0);
check('geen korting als het percentage nul is',
    berekenRemise(400000, 0), 0);
check('een percentage boven het maximum wordt afgetopt op 20 procent',
    berekenRemise(400000, 50), berekenRemise(400000, 20));
check('notariskosten met korting over 400.000 euro bij 5,00% is 30.610,62 euro',
    berekenNotarisAncien(400000, 5.00, meta, 20), 30610.62);
check('zonder korting blijft de uitkomst ongewijzigd',
    berekenNotarisAncien(400000, 5.00, meta, 0), berekenNotarisAncien(400000, 5.00, meta));

console.log('\nForfait of werkelijke kosten (blok C1)');
const hoog = kiesKostenpost(15000, 'werkelijk', 25000);
check('werkelijke kosten van 25.000 worden gebruikt als die modus is gekozen', hoog.bedrag, 25000);
check('bij 25.000 tegen een forfait van 15.000 is werkelijk gunstiger', hoog.gunstigste, 'werkelijk');
check('het verschil is 10.000 euro', hoog.verschil, 10000);
const laag = kiesKostenpost(15000, 'werkelijk', 9000);
check('bij 9.000 tegen een forfait van 15.000 is het forfait gunstiger', laag.gunstigste, 'forfait');
check('het verschil is 6.000 euro', laag.verschil, 6000);
check('in de forfaitmodus telt het forfait, ook al gaf de gebruiker een bedrag op',
    kiesKostenpost(15000, 'forfait', 25000).bedrag, 15000);
check('een negatief eigen bedrag telt als nul',
    kiesKostenpost(15000, 'werkelijk', -500).bedrag, 0);

console.log('\nGevoeligheden (blok C3)');
const basisInvoer = { ...STANDAARD_INVOER, aankoopMakelaarOptie: 'vendeur' };
const gev = berekenGevoeligheden(basisInvoer, dmto);
check('er worden nooit meer dan drie gevoeligheden getoond', gev.length <= 3, true);
check('de courtagekeuze wordt gemeten bij de koper',
    gev.find((g) => g.label.includes('Courtage')).metriek, 'koper');
check('een jaar langer wachten wordt gemeten bij de verkoper',
    gev.find((g) => g.label.includes('jaar langer')).metriek, 'verkoper');
check('een jaar langer wachten levert de verkoper geld op',
    gev.find((g) => g.label.includes('jaar langer')).gunstig, true);
check('primo-accedant verlaagt de kosten van de koper',
    gev.find((g) => g.label.includes('primo')).delta < 0, true);
check('een koper krijgt geen gevoeligheid over langer wachten',
    berekenGevoeligheden({ ...basisInvoer, rol: 'kopen' }, dmto)
        .some((g) => g.label.includes('jaar langer')), false);
check('een verkoper krijgt geen gevoeligheid over primo-accedant',
    berekenGevoeligheden({ ...basisInvoer, rol: 'verkopen' }, dmto)
        .some((g) => g.label.includes('primo')), false);
check('zonder makelaar vervalt de courtagegevoeligheid',
    berekenGevoeligheden({ ...basisInvoer, makelaarOptie: 'geen', aankoopMakelaarOptie: 'geen' }, dmto)
        .some((g) => g.label.includes('Courtage')), false);
check('in departement 06, zonder verschil tussen std en primo, vervalt die gevoeligheid',
    berekenGevoeligheden({ ...basisInvoer, postcode: '06000' }, dmto)
        .some((g) => g.label.includes('primo')), false);
check('jaarLater telt precies een jaar op', jaarLater('2025-01-01'), '2026-01-01');

console.log('\nOnbekende kostenposten (blok D3)');
const metOnbekend = berekenScenario({ ...STANDAARD_INVOER, diagnostics: 800 }, dmto);
check('landmeter en mainlevee gelden als onbekend, diagnostics niet',
    metOnbekend.onbekendePosten.join('|'), 'landmeter|mainlevée');
check('een onbekende post telt als nul in de berekening', metOnbekend.landmeter, 0);
check('een ingevulde post telt gewoon mee', metOnbekend.diagnostics, 800);
check('alle drie ingevuld geeft geen onbekende posten',
    berekenScenario({ ...STANDAARD_INVOER, landmeter: 1000, diagnostics: 800, mainlevee: 500 }, dmto)
        .onbekendePosten.length, 0);
check('de drie posten verlagen samen de meerwaardegrondslag',
    berekenScenario({ ...STANDAARD_INVOER, landmeter: 1000, diagnostics: 800, mainlevee: 500 }, dmto).verkoopkosten,
    2300);

console.log('\nWijze van verkrijging: forfait bestaat alleen bij een aankoop');
// Art. 150 VB II 2 en 3 CGI met art. 41 duovicies I van bijlage III.
check('bij gekocht bestaat het forfait', heeftAankoopkostenForfait('gekocht'), true);
check('bij geerfd bestaat het forfait niet', heeftAankoopkostenForfait('geerfd'), false);
check('bij geschonken bestaat het forfait niet', heeftAankoopkostenForfait('geschonken'), false);

const gekocht = berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'gekocht' }, dmto);
const geerfd = berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'geerfd' }, dmto);
check('bij gekocht is de aftrek 7,5 procent van 200.000, dus 15.000',
    gekocht.aankoopkosten.bedrag, 15000);
check('bij geerfd zonder opgave is de aftrek nul', geerfd.aankoopkosten.bedrag, 0);
check('bij geerfd meldt het model dat de verkrijgingskosten onbekend zijn',
    geerfd.verkrijgingskostenOnbekend, true);
check('bij gekocht is er niets onbekend', gekocht.verkrijgingskostenOnbekend, false);
check('de gemiste aftrek maakt de meerwaarde bij geerfd 15.000 euro hoger',
    rond(geerfd.brutoMeerwaarde - gekocht.brutoMeerwaarde), 15000);
check('en daarmee de belasting hoger, niet lager',
    geerfd.plusValueTax > gekocht.plusValueTax, true);
check('en de netto-opbrengst lager dan bij een gekocht pand',
    geerfd.nettoOpbrengst < gekocht.nettoOpbrengst, true);

const geerfdMetKosten = berekenScenario(
    { ...STANDAARD_INVOER, verkrijging: 'geerfd', aankoopkostenEigen: 18000 }, dmto);
check('bij geerfd telt het opgegeven werkelijke bedrag wel mee',
    geerfdMetKosten.aankoopkosten.bedrag, 18000);
check('en dan is er niets meer onbekend',
    geerfdMetKosten.verkrijgingskostenOnbekend, false);
check('bij geerfd wordt de forfaitmodus genegeerd, ook als die is ingesteld',
    berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'geerfd',
        aankoopkostenModus: 'forfait', aankoopkostenEigen: 18000 }, dmto).aankoopkosten.bedrag,
    18000);
check('bij geschonken geldt dezelfde route als bij geerfd',
    berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'geschonken' }, dmto).aankoopkosten.bedrag,
    geerfd.aankoopkosten.bedrag);

console.log('\nForfait voor werkzaamheden geldt niet voor kale grond');
// BOI-RFPI-PVI-20-10-20-20: de forfaitaire verhoging geldt uitsluitend bij
// bebouwde onroerende zaken, en is een keuze bij bezit langer dan vijf jaar.
check('bebouwd en langer dan vijf jaar in bezit geeft het forfait',
    heeftWerkzaamhedenForfait(10, false), true);
check('bouwgrond geeft geen forfait, ook niet na tien jaar',
    heeftWerkzaamhedenForfait(10, true), false);
check('bebouwd maar korter dan vijf jaar geeft geen forfait',
    heeftWerkzaamhedenForfait(3, false), false);
check('precies vijf jaar geeft nog geen forfait', heeftWerkzaamhedenForfait(5, false), false);
check('zes jaar geeft wel forfait', heeftWerkzaamhedenForfait(6, false), true);

const bebouwd = berekenScenario({ ...STANDAARD_INVOER }, dmto);
const kaleGrond = berekenScenario({ ...STANDAARD_INVOER, isBouwgrond: true }, dmto);
check('bij bebouwd is de aftrek 15 procent van 200.000, dus 30.000',
    bebouwd.werkzaamheden.bedrag, 30000);
check('bij bouwgrond is de aftrek nul', kaleGrond.werkzaamheden.bedrag, 0);
check('de meerwaarde is bij bouwgrond dus 30.000 euro hoger',
    rond(kaleGrond.brutoMeerwaarde - bebouwd.brutoMeerwaarde), 30000);
check('bij bouwgrond telt een opgegeven werkelijk bedrag wel mee',
    berekenScenario({ ...STANDAARD_INVOER, isBouwgrond: true, werkzaamhedenEigen: 12000 }, dmto)
        .werkzaamheden.bedrag, 12000);
check('bij bouwgrond blijft de surtaxe uitgesloten', kaleGrond.surtaxe, 0);

console.log('\nKoopsom en verkoopprijs staan los van elkaar');
check('een lege koopsom volgt de verkoopprijs',
    koopsomVan({ verkoopprijs: 400000, koopsom: null }), 400000);
check('een ingevulde koopsom gaat voor',
    koopsomVan({ verkoopprijs: 400000, koopsom: 550000 }), 550000);
check('een koopsom van nul is een opgave, geen leeg veld',
    koopsomVan({ verkoopprijs: 400000, koopsom: 0 }), 0);

const zonderKoopsom = berekenScenario({ ...STANDAARD_INVOER }, dmto);
const duurderGekocht = berekenScenario({ ...STANDAARD_INVOER, koopsom: 550000 }, dmto);
check('zonder eigen koopsom rekent de notaris over de verkoopprijs',
    zonderKoopsom.prijsVoorNotaris, 400000);
check('met een eigen koopsom rekent de notaris daarover',
    duurderGekocht.prijsVoorNotaris, 550000);
check('de notariskosten stijgen mee met de koopsom',
    duurderGekocht.notarisKosten > zonderKoopsom.notarisKosten, true);
check('maar de netto-opbrengst van de verkoper blijft gelijk',
    duurderGekocht.nettoOpbrengst, zonderKoopsom.nettoOpbrengst);
check('en de meerwaarde ook',
    duurderGekocht.brutoMeerwaarde, zonderKoopsom.brutoMeerwaarde);
check('een goedkoper gekocht huis verlaagt alleen de kosten van de koper',
    berekenScenario({ ...STANDAARD_INVOER, koopsom: 250000 }, dmto).nettoOpbrengst,
    zonderKoopsom.nettoOpbrengst);
check('de courtage van de aankoopmakelaar rekent over de koopsom, niet over de verkoopprijs',
    berekenScenario({ ...STANDAARD_INVOER, koopsom: 550000,
        aankoopMakelaarOptie: 'acquereur', aankoopMakelaarPerc: 4 }, dmto).makelaarsKostenAankoop,
    22000);
check('de courtage van de verkoopmakelaar rekent over de verkoopprijs',
    berekenScenario({ ...STANDAARD_INVOER, koopsom: 550000 }, dmto).makelaarsKostenVerkoop, 24000);

check('een koper zonder koopsom en zonder verkoopprijs wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, rol: 'kopen', verkoopprijs: 0, koopsom: null }, dmto).length > 0, true);
check('een koper met alleen een koopsom is geldig',
    valideer({ ...STANDAARD_INVOER, rol: 'kopen', verkoopprijs: 0, koopsom: 400000 }, dmto).length, 0);
check('een verkoper met alleen een verkoopprijs is geldig',
    valideer({ ...STANDAARD_INVOER, rol: 'verkopen', verkoopprijs: 400000, koopsom: null }, dmto).length, 0);
check('een negatieve koopsom wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, koopsom: -1 }, dmto).length > 0, true);
check('de koopsom overleeft de reis door de URL',
    queryNaarInvoer(invoerNaarQuery({ ...STANDAARD_INVOER, koopsom: 550000 })).koopsom, 550000);
check('een lege koopsom komt niet in de URL',
    invoerNaarQuery({ ...STANDAARD_INVOER, koopsom: null }).includes('ks='), false);

console.log('\nMakelaar: percentage en vast bedrag');
// 6 procent van 400.000 is 24.000; beide opgaven horen hetzelfde te geven.
check('percentage geeft dezelfde courtage als het gelijkwaardige vaste bedrag',
    makelaarCourtage(400000, { optie: 'vendeur', eenheid: 'percentage', perc: 6 }),
    makelaarCourtage(400000, { optie: 'vendeur', eenheid: 'bedrag', bedrag: 24000 }));
check('en dat is 24.000 euro',
    makelaarCourtage(400000, { optie: 'vendeur', eenheid: 'bedrag', bedrag: 24000 }), 24000);
check('geen makelaar geeft nul, ook met een bedrag ingevuld',
    makelaarCourtage(400000, { optie: 'geen', eenheid: 'bedrag', bedrag: 24000 }), 0);
check('een negatief bedrag telt als nul',
    makelaarCourtage(400000, { optie: 'vendeur', eenheid: 'bedrag', bedrag: -100 }), 0);

const perPercentage = berekenScenario({ ...STANDAARD_INVOER }, dmto);
const perBedrag = berekenScenario(
    { ...STANDAARD_INVOER, makelaarEenheid: 'bedrag', makelaarBedrag: 24000 }, dmto);
// kanten is een echo van de invoer, geen uitkomst; die hoort hier niet in.
const zonderEcho = ({ kanten, ...rest }) => JSON.stringify(rest);
check('elke uitkomst is identiek bij percentage en gelijkwaardig vast bedrag',
    zonderEcho(perBedrag), zonderEcho(perPercentage));

console.log('\nMakelaar: twee kanten in de route beide');
const kant = (inv) => makelaarKanten(inv);
check('bij een enkele transactie volgt de aankoopkant de verkoopkant',
    kant({ ...STANDAARD_INVOER, rol: 'kopen' }).aankoop.optie, STANDAARD_INVOER.makelaarOptie);
check('en neemt dan ook het percentage over',
    kant({ ...STANDAARD_INVOER, rol: 'kopen' }).aankoop.perc, STANDAARD_INVOER.makelaarPerc);
/* In de route beide zijn het twee transacties: niets ingevuld betekent daar
 * geen makelaar bij de aankoop, anders zou de keuze van de verkoper de kosten
 * van de koper veranderen. */
check('in de route beide valt de aankoopkant niet terug op de verkoopkant',
    kant({ ...STANDAARD_INVOER, rol: 'beide' }).aankoop.optie, 'geen');
check('een eigen waarde aan de aankoopkant overschrijft die terugval',
    kant({ ...STANDAARD_INVOER, aankoopMakelaarOptie: 'acquereur' }).aankoop.optie, 'acquereur');
check('de verkoopkant blijft daarbij ongemoeid',
    kant({ ...STANDAARD_INVOER, aankoopMakelaarOptie: 'acquereur' }).verkoop.optie, 'vendeur');

// Aankoop charge acquereur, verkoop charge vendeur: twee verschillende
// transacties, dus de notarisgrondslag en de netto-opbrengst lopen uiteen.
const tweeKanten = berekenScenario({
    ...STANDAARD_INVOER, rol: 'beide',
    makelaarOptie: 'vendeur',
    aankoopMakelaarOptie: 'acquereur'
}, dmto);
check('de notarisgrondslag volgt de aankoopkant, dus prijs min courtage',
    tweeKanten.prijsVoorNotaris, 376000);
check('de netto-opbrengst volgt de verkoopkant, dus courtage van de verkoper af',
    tweeKanten.makelaarsKostenVerkoop, 24000);
check('beide kanten leveren hier hetzelfde courtagebedrag op',
    tweeKanten.makelaarsKostenAankoop, tweeKanten.makelaarsKostenVerkoop);
check('de meerwaardegrondslag is die van de verkoopkant',
    tweeKanten.nettoVerkoperBasis, 376000);
check('een andere aankoopkant verandert de netto-opbrengst van de verkoper niet',
    tweeKanten.nettoOpbrengst, perPercentage.nettoOpbrengst);
check('maar wel de notariskosten van de koper',
    tweeKanten.notarisKosten !== perPercentage.notarisKosten, true);

const aankoopVastBedrag = berekenScenario({
    ...STANDAARD_INVOER, rol: 'beide',
    aankoopMakelaarOptie: 'acquereur',
    aankoopMakelaarEenheid: 'bedrag', aankoopMakelaarBedrag: 24000
}, dmto);
check('een vast bedrag aan de aankoopkant geeft dezelfde grondslag als het percentage',
    aankoopVastBedrag.prijsVoorNotaris, tweeKanten.prijsVoorNotaris);
check('en dezelfde notariskosten', aankoopVastBedrag.notarisKosten, tweeKanten.notarisKosten);

console.log('\nVerkrijgingskosten mogen onbekend zijn');
check('de standaardinvoer laat de verkrijgingskosten op onbekend staan',
    STANDAARD_INVOER.aankoopkostenEigen, null);
const erfOnbekend = berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'geerfd' }, dmto);
const erfBekend = berekenScenario(
    { ...STANDAARD_INVOER, verkrijging: 'geerfd', aankoopkostenEigen: 18000 }, dmto);
check('onbekend geeft geen aftrek', erfOnbekend.aankoopkosten.bedrag, 0);
check('onbekend wordt als zodanig gemeld', erfOnbekend.verkrijgingskostenOnbekend, true);
check('een ingevuld bedrag geeft wel aftrek', erfBekend.aankoopkosten.bedrag, 18000);
check('en dan is er niets onbekend', erfBekend.verkrijgingskostenOnbekend, false);
check('de gemiste aftrek maakt de belasting bij onbekend hoger',
    erfOnbekend.plusValueTax > erfBekend.plusValueTax, true);
check('nul is iets anders dan onbekend: nul is een opgave',
    berekenScenario({ ...STANDAARD_INVOER, verkrijging: 'geerfd', aankoopkostenEigen: 0 }, dmto)
        .verkrijgingskostenOnbekend, true);
check('onbekende verkrijgingskosten komen niet in de URL',
    invoerNaarQuery({ ...STANDAARD_INVOER, aankoopkostenEigen: null }).includes('ake='), false);
check('en overleven de reis als onbekend',
    queryNaarInvoer(invoerNaarQuery({ ...STANDAARD_INVOER, aankoopkostenEigen: null }))
        .aankoopkostenEigen, null);

console.log('\nURL-codering heen en terug (blok D4)');
check('de standaardinvoer levert een lege querystring', invoerNaarQuery(STANDAARD_INVOER), '');
check('de standaardinvoer komt ongeschonden terug',
    JSON.stringify(queryNaarInvoer('')), JSON.stringify(STANDAARD_INVOER));
const afwijkend = {
    ...STANDAARD_INVOER,
    rol: 'verkopen',
    postcode: '20000',
    isNieuwbouw: true,
    isPrimo: true,
    remisePct: 15,
    makelaarOptie: 'acquereur',
    makelaarEenheid: 'bedrag',
    makelaarPerc: 4.5,
    makelaarBedrag: 19500,
    aankoopMakelaarOptie: 'vendeur',
    aankoopMakelaarEenheid: 'percentage',
    aankoopMakelaarPerc: 3,
    aankoopMakelaarBedrag: 0,
    verkoopprijs: 675000,
    koopsom: 512000,
    aankoopprijs: 250000,
    datumAankoop: '2003-12-15',
    datumVerkoop: '2026-01-10',
    isHoofdverblijf: true,
    isNietIngezetene: true,
    isGemeubileerdReeel: true,
    isBouwgrond: true,
    aantalVerkopers: 3,
    verkrijging: 'geschonken',
    aankoopkostenModus: 'werkelijk',
    aankoopkostenEigen: 21000,
    werkzaamhedenModus: 'werkelijk',
    werkzaamhedenEigen: 48000,
    landmeter: 1250,
    diagnostics: 800,
    mainlevee: 650,
    deRuyter: true
};
check('elk afwijkend veld overleeft de reis door de URL',
    JSON.stringify(queryNaarInvoer(invoerNaarQuery(afwijkend))), JSON.stringify(afwijkend));
check('een onbekende post komt niet in de URL terecht',
    invoerNaarQuery({ ...STANDAARD_INVOER, landmeter: null }).includes('lm='), false);
check('een post met waarde nul komt wel in de URL, want nul is niet onbekend',
    invoerNaarQuery({ ...STANDAARD_INVOER, landmeter: 0 }).includes('lm=0'), true);
check('nul en onbekend blijven na de reis van elkaar te onderscheiden',
    queryNaarInvoer(invoerNaarQuery({ ...STANDAARD_INVOER, landmeter: 0 })).landmeter, 0);
check('onbekend blijft onbekend na de reis',
    queryNaarInvoer(invoerNaarQuery({ ...STANDAARD_INVOER, landmeter: null })).landmeter, null);
check('onbekende parameters in de URL worden genegeerd',
    queryNaarInvoer('?onzin=1&rol=kopen').rol, 'kopen');
check('elke sleutel in URL_VELDEN bestaat in STANDAARD_INVOER',
    URL_VELDEN.every(([sleutel]) => sleutel in STANDAARD_INVOER), true);
check('elke sleutel in STANDAARD_INVOER zit in URL_VELDEN',
    Object.keys(STANDAARD_INVOER).every((s) => URL_VELDEN.some(([k]) => k === s)), true);
check('geen twee velden delen dezelfde URL-parameter',
    new Set(URL_VELDEN.map(([, p]) => p)).size, URL_VELDEN.length);

console.log('\nValidatie (blok D5)');
check('de standaardinvoer is geldig', valideer(STANDAARD_INVOER, dmto).length, 0);
check('een verkoopprijs van nul wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, verkoopprijs: 0 }, dmto).length > 0, true);
check('een negatieve verkoopprijs wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, verkoopprijs: -1 }, dmto).length > 0, true);
check('een negatieve aankoopsom wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, aankoopprijs: -100 }, dmto).length > 0, true);
check('een negatieve landmeterpost wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, landmeter: -1 }, dmto).length > 0, true);
check('een onbekende landmeterpost wordt niet afgekeurd',
    valideer({ ...STANDAARD_INVOER, landmeter: null }, dmto).length, 0);
check('een verkoopdatum voor de aankoopdatum wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, datumVerkoop: '2010-01-01' }, dmto).length > 0, true);
check('die datumcontrole geldt niet voor wie alleen koopt',
    valideer({ ...STANDAARD_INVOER, rol: 'kopen', datumVerkoop: '2010-01-01' }, dmto).length, 0);
check('een postcode buiten de DGFiP-tabel wordt afgekeurd bij een aankoop',
    valideer({ ...STANDAARD_INVOER, postcode: '97500' }, dmto).length > 0, true);
check('die postcodecontrole geldt niet voor wie alleen verkoopt',
    valideer({ ...STANDAARD_INVOER, rol: 'verkopen', postcode: '97500' }, dmto).length, 0);
check('die postcodecontrole geldt niet bij nieuwbouw',
    valideer({ ...STANDAARD_INVOER, postcode: '97500', isNieuwbouw: true }, dmto).length, 0);
check('minder dan een verkoper wordt afgekeurd',
    valideer({ ...STANDAARD_INVOER, aantalVerkopers: 0 }, dmto).length > 0, true);

console.log('\nSignaleringen bevatten geen cijfers (blok B, grondregel)');
// De grondregel: nooit een bedrag, een percentage of een termijn in een
// signalering. Het veld artikelen is uitgezonderd, want een wetsartikel bevat
// per definitie cijfers en is geen van die drie.
for (const [sleutel, s] of Object.entries(SIGNALERINGEN)) {
    const cijfers = `${s.titel} ${s.tekst}`.match(/[0-9]/g);
    check(`signalering ${sleutel} bevat geen enkel cijfer in titel of tekst`,
        cijfers === null, true);
}
check('elke signalering heeft een titel, een tekst en een artikelenlijst',
    Object.values(SIGNALERINGEN).every((s) =>
        typeof s.titel === 'string' && s.titel.length > 0
        && typeof s.tekst === 'string' && s.tekst.length > 0
        && Array.isArray(s.artikelen)), true);

console.log('\nWanneer verschijnt een signalering?');
check('een koper krijgt er geen',
    bepaalSignaleringen({ rol: 'kopen', belastbareMeerwaarde: 90000 }).length, 0);
check('zonder belastbare meerwaarde geen signaleringen',
    bepaalSignaleringen({ rol: 'verkopen', belastbareMeerwaarde: 0 }).length, 0);
check('een verkoper met meerwaarde krijgt de twee algemene signaleringen',
    bepaalSignaleringen({ rol: 'verkopen', belastbareMeerwaarde: 90000 }).length, 2);
check('niet-ingezetene en gemeubileerde verhuur komen daar bovenop',
    bepaalSignaleringen({
        rol: 'verkopen', belastbareMeerwaarde: 90000,
        isNietIngezetene: true, isGemeubileerdReeel: true
    }).length, 4);

console.log('\nVerwijzing naar het artikel');
const html = readFileSync(join(hier, 'index.html'), 'utf8');
const canonical = /<link\s+rel="canonical"\s+href="([^"]+)"/.exec(html);
check('index.html bevat een canonical', canonical !== null, true);
check('de canonical is gelijk aan ARTIKEL_URL in calc.js',
    canonical && canonical[1], ARTIKEL_URL);
check('ARTIKEL_URL bevat geen placeholder meer',
    /VERVANG/i.test(ARTIKEL_URL), false);
check('index.html zet robots op noindex', /name="robots"\s+content="noindex/.test(html), true);

/* Het hoofdadres hoort de nieuwe schil te draaien; de vorige interface blijft
 * als terugvaloptie bestaan. Deze twee assertions vallen om zodra de bestanden
 * per ongeluk weer worden omgewisseld. */
const oudeHtml = readFileSync(join(hier, 'index-oud.html'), 'utf8');
check('index.html draait de nieuwe schil', html.includes('class="rekentool"'), true);
check('en laadt schil.js', html.includes('src="schil.js"'), true);
check('index-oud.html is de vorige interface', oudeHtml.includes('id="spec_table"'), true);
check('de terugvaloptie wordt niet geindexeerd',
    /name="robots"\s+content="noindex/.test(oudeHtml), true);
check('en draagt geen tweede canonical', oudeHtml.includes('rel="canonical"'), false);

console.log('\nTerugname van afschrijvingen poort op de verkoopdatum');
// Art. 84 van wet 2025-127 geldt voor verkopen vanaf 15 februari 2025.
const gemeubileerd = (datumVerkoop) => bepaalSignaleringen({
    rol: 'verkopen', belastbareMeerwaarde: 90000, isGemeubileerdReeel: true, datumVerkoop
}).includes(SIGNALERINGEN.gemeubileerdReeel);
check('de ingangsdatum is 15 februari 2025', TERUGNAME_AFSCHRIJVINGEN_VANAF, '2025-02-15');
check('een verkoop op 14 februari 2025 valt er nog niet onder', gemeubileerd('2025-02-14'), false);
check('een verkoop op 15 februari 2025 valt er wel onder', gemeubileerd('2025-02-15'), true);
check('een verkoop op 16 februari 2025 valt er wel onder', gemeubileerd('2025-02-16'), true);
check('een verkoop lang voor de ingangsdatum valt er niet onder', gemeubileerd('2019-06-30'), false);
check('een verkoop ver na de ingangsdatum valt er wel onder', gemeubileerd('2026-06-01'), true);
check('zonder verkoopdatum wordt de signalering wel getoond', gemeubileerd(undefined), true);
check('bij een onleesbare verkoopdatum wordt de signalering wel getoond', gemeubileerd('geen datum'), true);
check('zonder het vinkje verschijnt de signalering ook na de ingangsdatum niet',
    bepaalSignaleringen({
        rol: 'verkopen', belastbareMeerwaarde: 90000,
        isGemeubileerdReeel: false, datumVerkoop: '2026-06-01'
    }).includes(SIGNALERINGEN.gemeubileerdReeel), false);
check('een verkoop voor de ingangsdatum houdt wel de twee algemene signaleringen over',
    bepaalSignaleringen({
        rol: 'verkopen', belastbareMeerwaarde: 90000,
        isGemeubileerdReeel: true, datumVerkoop: '2024-01-01'
    }).length, 2);

console.log('\nDe vertaaltabel van de schil naar de kern');
adapter.zetTarieven(dmto);

/* Eén volledig ingevuld schilobject, met elke keuze op een waarde die van de
 * standaard afwijkt, zodat een vergeten veld opvalt. */
const uiVol = {
    rol: 'beide',
    postcode: '20000',
    koopsom: '550.000',
    verkoopprijs: '400.000',
    type: 'nieuwbouw',
    hoofdverblijf: 'nee',
    bouwgrond: 'ja',
    verkrijging: 'geerfd',
    aankoopprijs: '200.000',
    verkrijgingskosten: '18.000',
    datumVerkrijging: '2003-12-15',
    datumVerkoop: '2026-01-10',
    aantalVerkopers: 3,
    mkKoopPartij: 'koper', mkKoopModus: 'bedrag', mkKoopWaarde: '12.000',
    mkVerkPartij: 'verkoper', mkVerkModus: 'percentage', mkVerkWaarde: '4,5',
    landmeter: '1.250', diagnostics: '800', doorhaling: '650',
    aktesBedrag: '21.000', verbouwdBedrag: '48.000',
    weetNiet: {},
    verfijning: {
        eersteWoning: true, kortingHonorarium: true, fiscaalBuiten: true,
        verzekerdBuiten: true, gemeubileerdReel: true, verbouwd: true
    }
};
const kernVol = adapter.naarKern(uiVol);

check('rol koper wordt kopen', adapter.naarKern({ rol: 'koper' }).rol, 'kopen');
check('rol verkoper wordt verkopen', adapter.naarKern({ rol: 'verkoper' }).rol, 'verkopen');
check('rol beide blijft beide', kernVol.rol, 'beide');
check('postcode gaat ongewijzigd door', kernVol.postcode, '20000');
check('koopsom wordt een getal zonder scheidingstekens', kernVol.koopsom, 550000);
check('verkoopprijs idem', kernVol.verkoopprijs, 400000);
check('type nieuwbouw wordt isNieuwbouw true', kernVol.isNieuwbouw, true);
check('type bestaand wordt isNieuwbouw false',
    adapter.naarKern({ type: 'bestaand' }).isNieuwbouw, false);
check('hoofdverblijf ja wordt true',
    adapter.naarKern({ hoofdverblijf: 'ja' }).isHoofdverblijf, true);
check('hoofdverblijf nee wordt false', kernVol.isHoofdverblijf, false);
check('bouwgrond ja wordt true', kernVol.isBouwgrond, true);
check('bouwgrond nee wordt false',
    adapter.naarKern({ bouwgrond: 'nee' }).isBouwgrond, false);
check('verkrijging gaat ongewijzigd door', kernVol.verkrijging, 'geerfd');
check('aankoopprijs gaat door', kernVol.aankoopprijs, 200000);
check('datumVerkrijging wordt datumAankoop', kernVol.datumAankoop, '2003-12-15');
check('datumVerkoop gaat door', kernVol.datumVerkoop, '2026-01-10');
check('aantalVerkopers gaat door', kernVol.aantalVerkopers, 3);
check('eersteWoning wordt isPrimo', kernVol.isPrimo, true);
check('fiscaalBuiten wordt isNietIngezetene', kernVol.isNietIngezetene, true);
check('gemeubileerdReel wordt isGemeubileerdReeel', kernVol.isGemeubileerdReeel, true);
check('verzekerdBuiten wordt deRuyter', kernVol.deRuyter, true);
check('kortingHonorarium aan wordt het wettelijke maximum',
    kernVol.remisePct, 20);
check('kortingHonorarium uit wordt nul',
    adapter.naarKern({}).remisePct, 0);

check('mkVerkPartij verkoper wordt vendeur', kernVol.makelaarOptie, 'vendeur');
check('mkKoopPartij koper wordt acquereur', kernVol.aankoopMakelaarOptie, 'acquereur');
check('geen makelaar blijft geen',
    adapter.naarKern({ mkVerkPartij: 'geen' }).makelaarOptie, 'geen');
check('een niet gekozen makelaar telt als geen',
    adapter.naarKern({}).makelaarOptie, 'geen');
check('mkVerkModus percentage komt in makelaarEenheid', kernVol.makelaarEenheid, 'percentage');
check('mkKoopModus bedrag komt in aankoopMakelaarEenheid', kernVol.aankoopMakelaarEenheid, 'bedrag');
check('een courtage met komma wordt een kommagetal', kernVol.makelaarPerc, 4.5);
check('een courtage als bedrag wordt een heel bedrag', kernVol.aankoopMakelaarBedrag, 12000);

check('bij erven komt verkrijgingskosten in aankoopkostenEigen',
    kernVol.aankoopkostenEigen, 18000);
check('en staat de modus op werkelijk', kernVol.aankoopkostenModus, 'werkelijk');
check('bij een aankoop met de verfijning aktes komt aktesBedrag daarin',
    adapter.naarKern({ verkrijging: 'gekocht', aktesBedrag: '21.000', verfijning: { aktes: true } })
        .aankoopkostenEigen, 21000);
check('zonder die verfijning blijft het forfait staan',
    adapter.naarKern({ verkrijging: 'gekocht', aktesBedrag: '21.000' }).aankoopkostenModus, 'forfait');
check('verbouwd met facturen zet de modus op werkelijk', kernVol.werkzaamhedenModus, 'werkelijk');
check('en geeft het bedrag door', kernVol.werkzaamhedenEigen, 48000);
check('zonder die verfijning blijft het forfait staan',
    adapter.naarKern({ verbouwdBedrag: '48.000' }).werkzaamhedenModus, 'forfait');

check('diagnostics gaat door', kernVol.diagnostics, 800);
check('doorhaling wordt mainlevee', kernVol.mainlevee, 650);
check('landmeter gaat door', kernVol.landmeter, 1250);
const uiWeetNiet = { ...uiVol, weetNiet: { landmeter: true, diagnostics: true, doorhaling: true, verkrijgingskosten: true } };
check('weet ik niet maakt landmeter onbekend', adapter.naarKern(uiWeetNiet).landmeter, null);
check('weet ik niet maakt diagnostics onbekend', adapter.naarKern(uiWeetNiet).diagnostics, null);
check('weet ik niet maakt de doorhaling onbekend', adapter.naarKern(uiWeetNiet).mainlevee, null);
check('weet ik niet maakt de verkrijgingskosten onbekend',
    adapter.naarKern(uiWeetNiet).aankoopkostenEigen, null);
/* Onaangeroerd en expliciet onbekend zijn twee verschillende dingen. Alleen een
 * klik op "weet ik niet" maakt de post onbekend; een leeg veld telt als nul. */
check('een leeg veld dat niet is aangeraakt telt als nul, niet als onbekend',
    adapter.naarKern({ ...uiVol, landmeter: '' }).landmeter, 0);
check('een leeg veld met weet ik niet is wel onbekend',
    adapter.naarKern({ ...uiVol, landmeter: '', weetNiet: { landmeter: true } }).landmeter, null);
check('een ingevuld veld met weet ik niet is ook onbekend, de klik gaat voor',
    adapter.naarKern({ ...uiVol, weetNiet: { landmeter: true } }).landmeter, null);

check('elk kernveld dat de tabel oplevert bestaat in STANDAARD_INVOER',
    Object.keys(kernVol).every((k) => k in STANDAARD_INVOER), true);
check('de tabel vult elk kernveld',
    Object.keys(STANDAARD_INVOER).every((k) => k in kernVol), true);

console.log('\nMakelaar: percentage en vast bedrag geven hetzelfde via de schil');
const uiPct = {
    rol: 'verkoper', postcode: '58000', verkoopprijs: '400.000', hoofdverblijf: 'nee',
    bouwgrond: 'nee', verkrijging: 'gekocht', aankoopprijs: '200.000',
    datumVerkrijging: '2015-01-01', datumVerkoop: '2025-01-01', aantalVerkopers: 1,
    mkVerkPartij: 'verkoper', mkVerkModus: 'percentage', mkVerkWaarde: '6',
    weetNiet: {}, verfijning: { makelaarVerk: true }
};
const uiBedrag = { ...uiPct, mkVerkModus: 'bedrag', mkVerkWaarde: '24.000' };
check('zes procent van 400.000 is hetzelfde als 24.000 euro vast',
    adapter.bereken(uiBedrag).verkoper.bedrag, adapter.bereken(uiPct).verkoper.bedrag);
check('en dat is een echt bedrag, geen null',
    typeof adapter.bereken(uiPct).verkoper.bedrag, 'number');

console.log('\nRoute beide met verschillende makelaarpartijen aan weerszijden');
const uiBeide = {
    ...uiPct, rol: 'beide', koopsom: '550.000', type: 'bestaand',
    mkKoopPartij: 'koper', mkKoopModus: 'percentage', mkKoopWaarde: '4',
    verfijning: { makelaarVerk: true, makelaarKoop: true }
};
const beide = adapter.bereken(uiBeide);
check('de koper betaalt zijn eigen courtage over de koopsom',
    beide.res.makelaarsKostenAankoop, 22000);
check('de verkoper betaalt de zijne over de verkoopprijs',
    beide.res.makelaarsKostenVerkoop, 24000);
check('de notarisgrondslag is de koopsom min de courtage van de koper',
    beide.res.prijsVoorNotaris, 528000);
check('de meerwaardegrondslag is de verkoopprijs min de courtage van de verkoper',
    beide.res.nettoVerkoperBasis, 376000);
check('een andere partij aan de aankoopkant verandert de netto-opbrengst niet',
    adapter.bereken({ ...uiBeide, mkKoopPartij: 'verkoper' }).verkoper.bedrag,
    beide.verkoper.bedrag);
check('maar wel wat de koper bovenop de koopsom kwijt is',
    adapter.bereken({ ...uiBeide, mkKoopPartij: 'verkoper' }).koper.bovenopKoopsom
        !== beide.koper.bovenopKoopsom, true);

console.log('\nErven met en zonder opgegeven verkrijgingskosten, via de schil');
const uiErf = {
    ...uiPct, verkrijging: 'geerfd', verkrijgingskosten: '', weetNiet: { verkrijgingskosten: true }
};
const uiErfBedrag = { ...uiErf, verkrijgingskosten: '18.000', weetNiet: {} };
check('onbekende verkrijgingskosten worden gemeld',
    adapter.bereken(uiErf).verkrijgingskostenOnbekend, true);
check('met een bedrag is er niets onbekend',
    adapter.bereken(uiErfBedrag).verkrijgingskostenOnbekend, false);
check('de gemiste aftrek verlaagt wat de verkoper overhoudt',
    adapter.bereken(uiErf).verkoper.bedrag < adapter.bereken(uiErfBedrag).verkoper.bedrag, true);
check('het verschil is de belasting over 18.000 euro extra meerwaarde',
    adapter.bereken(uiErfBedrag).verkoper.bedrag > adapter.bereken(uiErf).verkoper.bedrag, true);

console.log('\nDe koperroute raakt geen enkele verkoperszaak');

/* 1. Een onaangeroerd koperscenario mag geen enkele post als onbekend melden. */
check('een koperscenario met alle standaardwaarden geeft een lege onbekendePosten',
    berekenScenario({ ...STANDAARD_INVOER, rol: 'kopen' }, dmto).onbekendePosten.length, 0);
check('en meldt ook geen ontbrekende verkrijgingskosten',
    berekenScenario({ ...STANDAARD_INVOER, rol: 'kopen', verkrijging: 'geerfd' }, dmto)
        .verkrijgingskostenOnbekend, false);
check('bij de rol verkopen worden diezelfde posten wel gemeld',
    berekenScenario({ ...STANDAARD_INVOER, rol: 'verkopen' }, dmto).onbekendePosten.length, 3);
check('en bij beide ook', berekenScenario({ ...STANDAARD_INVOER, rol: 'beide' }, dmto)
    .onbekendePosten.length, 3);

const uiKoper = {
    rol: 'koper', postcode: '58000', koopsom: '400.000', type: 'bestaand',
    weetNiet: {}, verfijning: {}
};
check('via de schil geeft een onaangeroerd koperscherm geen melding',
    adapter.bereken(uiKoper).onvolledig.length, 0);

/* 2. Ook met "weet ik niet" op alle verkoperskosten hoort de koper niets te
 *    merken: die posten horen niet bij zijn transactie. */
const uiKoperOnbekend = {
    ...uiKoper, weetNiet: { landmeter: true, diagnostics: true, doorhaling: true }
};
check('weet ik niet op alle verkoperskosten geeft de koper geen melding',
    adapter.bereken(uiKoperOnbekend).onvolledig.length, 0);
check('en laat zijn totaalbedrag ongemoeid',
    adapter.bereken(uiKoperOnbekend).koper.bovenopKoopsom,
    adapter.bereken(uiKoper).koper.bovenopKoopsom);
check('ook het alles-in bedrag blijft gelijk',
    adapter.bereken(uiKoperOnbekend).koper.bedrag, adapter.bereken(uiKoper).koper.bedrag);

/* De sterkere eis: geen enkel verkopersveld mag het bedrag van de koper
 * bewegen, en geen enkel kopersveld dat van de verkoper. */
const basisBeide = {
    ...STANDAARD_INVOER, rol: 'beide', koopsom: 550000, verkoopprijs: 400000,
    datumAankoop: '2015-01-01', datumVerkoop: '2025-01-01'
};
const nulmeting = berekenScenario(basisBeide, dmto);
const VERKOPERSVELDEN = {
    verkoopprijs: 900000, aankoopprijs: 111000, datumAankoop: '1999-03-03',
    datumVerkoop: '2030-09-09', isHoofdverblijf: true, isBouwgrond: true,
    isNietIngezetene: true, isGemeubileerdReeel: true, deRuyter: true,
    aantalVerkopers: 7, verkrijging: 'geschonken', aankoopkostenModus: 'werkelijk',
    aankoopkostenEigen: 33000, werkzaamhedenModus: 'werkelijk', werkzaamhedenEigen: 44000,
    landmeter: 1234, diagnostics: 567, mainlevee: 890,
    makelaarOptie: 'acquereur', makelaarEenheid: 'bedrag', makelaarPerc: 9, makelaarBedrag: 55000
};
for (const [veld, waarde] of Object.entries(VERKOPERSVELDEN)) {
    check(`verkopersveld ${veld} laat de kosten van de koper ongemoeid`,
        berekenScenario({ ...basisBeide, [veld]: waarde }, dmto).totaalKostenKoper,
        nulmeting.totaalKostenKoper);
}
const KOPERSVELDEN = {
    koopsom: 975000, postcode: '75001', isNieuwbouw: true, isPrimo: true, remisePct: 20,
    aankoopMakelaarOptie: 'acquereur', aankoopMakelaarEenheid: 'bedrag',
    aankoopMakelaarPerc: 8, aankoopMakelaarBedrag: 41000
};
for (const [veld, waarde] of Object.entries(KOPERSVELDEN)) {
    check(`kopersveld ${veld} laat de opbrengst van de verkoper ongemoeid`,
        berekenScenario({ ...basisBeide, [veld]: waarde }, dmto).nettoOpbrengst,
        nulmeting.nettoOpbrengst);
}

console.log('\nDe opbouw telt op tot het getoonde bedrag');

/* De opbouw hoort precies uit te komen op het bedrag erboven. Telt hij niet op,
 * dan staat er ergens een post dubbel of ontbreekt er een. */
const somVan = (posten) => rond(posten.reduce((t, p) => t + (p.bedrag || 0), 0));
const opbouwKlopt = (naam, ui) => {
    const r = adapter.bereken(ui);
    check(`koperopbouw telt op tot het getoonde bedrag: ${naam}`,
        somVan(r.koper.posten), rond(r.koper.bovenopKoopsom));
};
const kBasis = {
    rol: 'koper', postcode: '63000', koopsom: '780.000', type: 'bestaand',
    weetNiet: {}, verfijning: {}
};
opbouwKlopt('kaal', kBasis);
opbouwKlopt('met primo-accédant', { ...kBasis, verfijning: { eersteWoning: true } });
/* Deze combinatie liet de fout zien: het honorarium stond netto in de opbouw en
 * de korting werd daarnaast nog eens afgetrokken, dus telde die dubbel. */
opbouwKlopt('met korting op het honorarium', { ...kBasis, verfijning: { kortingHonorarium: true } });
opbouwKlopt('met primo en korting',
    { ...kBasis, verfijning: { eersteWoning: true, kortingHonorarium: true } });
opbouwKlopt('met makelaar ten laste van de koper',
    { ...kBasis, mkKoopPartij: 'koper', mkKoopModus: 'percentage', mkKoopWaarde: '4',
        verfijning: { makelaarKoop: true } });
opbouwKlopt('nieuwbouw', { ...kBasis, type: 'nieuwbouw' });
opbouwKlopt('nieuwbouw met korting',
    { ...kBasis, type: 'nieuwbouw', verfijning: { kortingHonorarium: true } });

/* Het honorarium in de opbouw staat bruto; de korting is een eigen regel. */
const metKorting = adapter.bereken({ ...kBasis, verfijning: { kortingHonorarium: true } });
const honorarium = metKorting.koper.posten.find((p) => p.label === 'Notarishonorarium');
const kortingRegel = metKorting.koper.posten.find((p) => p.label.startsWith('Korting'));
check('het honorarium staat bruto in de opbouw',
    honorarium.bedrag, berekenEmolumenten(780000));
check('de korting staat als eigen, negatieve regel', kortingRegel.bedrag < 0, true);
check('en de btw is berekend over het honorarium na korting',
    rond(metKorting.koper.posten.find((p) => p.label.startsWith('Btw')).bedrag),
    rond((honorarium.bedrag + kortingRegel.bedrag) * 0.20));

/* De verfijningen mogen samen precies het verschil in het totaal verklaren. */
const kaal = adapter.bereken(kBasis).koper.bovenopKoopsom;
const alleenPrimo = adapter.bereken({ ...kBasis, verfijning: { eersteWoning: true } }).koper.bovenopKoopsom;
const alleenKorting = adapter.bereken({ ...kBasis, verfijning: { kortingHonorarium: true } }).koper.bovenopKoopsom;
const samen = adapter.bereken({ ...kBasis, verfijning: { eersteWoning: true, kortingHonorarium: true } }).koper.bovenopKoopsom;
check('primo en korting samen scheelt evenveel als de twee apart',
    rond((kaal - alleenPrimo) + (kaal - alleenKorting)), rond(kaal - samen));
check('het getoonde effect van primo-accédant is wat er werkelijk gebeurt',
    adapter.effecten(kBasis).eersteWoning, -rond(kaal - alleenPrimo));

/* Wat wettelijk vastligt en wat een schatting is, moet uit de opbouw blijken. */
const soorten = adapter.bereken(kBasis).koper.posten.map((p) => p.soort);
check('elke post in de opbouw zegt waar hij vandaan komt',
    soorten.every((s) => s in adapter.SOORT_TEKST), true);
check('de contribution de sécurité immobilière heet bij zijn eigen naam',
    adapter.bereken(kBasis).koper.posten.some((p) => p.label === 'Contribution de sécurité immobilière'), true);
check('en staat als wettelijk tarief gemarkeerd',
    adapter.bereken(kBasis).koper.posten
        .find((p) => p.label === 'Contribution de sécurité immobilière').soort, 'wettelijk');
check('de débours staan als schatting gemarkeerd',
    adapter.bereken(kBasis).koper.posten
        .find((p) => p.label.startsWith('Débours')).soort, 'schatting');
check('geen twee posten dragen dezelfde naam',
    new Set(adapter.bereken(kBasis).koper.posten.map((p) => p.label)).size,
    adapter.bereken(kBasis).koper.posten.length);

console.log('\nDe schil deelt via de URL');
const heen = adapter.naarQuery(uiVol);
const terug = adapter.uitQuery(heen);
check('de postcode overleeft de reis', terug.antwoorden.postcode, '20000');
check('de koopsom komt geformatteerd terug', terug.antwoorden.koopsom, '550.000');
check('de verkrijging komt terug', terug.antwoorden.verkrijging, 'geerfd');
check('bouwgrond komt terug', terug.antwoorden.bouwgrond, 'ja');
check('hoofdverblijf komt terug', terug.antwoorden.hoofdverblijf, 'nee');
check('het woningtype komt terug', terug.antwoorden.type, 'nieuwbouw');
check('de datums komen terug', terug.antwoorden.datumVerkrijging, '2003-12-15');
check('het aantal verkopers komt terug', terug.antwoorden.aantalVerkopers, 3);
check('de aanstaande verfijningen komen terug',
    terug.verfijning.eersteWoning && terug.verfijning.kortingHonorarium
    && terug.verfijning.fiscaalBuiten && terug.verfijning.verbouwd, true);
check('een uitstaande verfijning blijft uit', Boolean(terug.verfijning.aktes), false);
check('de makelaarpartijen komen terug',
    `${terug.antwoorden.mkKoopPartij}/${terug.antwoorden.mkVerkPartij}`, 'koper/verkoper');
check('de courtage-eenheden komen terug',
    `${terug.antwoorden.mkKoopModus}/${terug.antwoorden.mkVerkModus}`, 'bedrag/percentage');
const terugWeetNiet = adapter.uitQuery(adapter.naarQuery(uiWeetNiet));
check('weet ik niet overleeft de reis',
    Boolean(terugWeetNiet.weetNiet.landmeter && terugWeetNiet.weetNiet.diagnostics
        && terugWeetNiet.weetNiet.doorhaling), true);
check('een leeg antwoord blijft leeg zonder er een keuze van te maken',
    adapter.uitQuery('').antwoorden.hoofdverblijf, undefined);

console.log('\nZonder tarieventabel rekent de schil niet');
check('de peildatum is opgemaakt als Nederlandse datum',
    adapter.nederlandseDatum('2026-06-01'), '1 juni 2026');
check('een onleesbare datum wordt niet verzonnen',
    adapter.nederlandseDatum('onzin'), 'onzin');
check('de peildatum komt uit het bestand, niet uit de code',
    adapter.laadMeta().peildatum, adapter.nederlandseDatum(dmto._meta.peildatum));
check('de bron komt uit het bestand', adapter.laadMeta().bron, dmto._meta.uitgever);
check('een postcode buiten de tabel wordt als onbekend gemeld',
    adapter.kentPostcode('97500'), false);
check('een postcode in de tabel wordt herkend', adapter.kentPostcode('20000'), true);

console.log(`\n${geslaagd} geslaagd, ${mislukt.length} mislukt.`);
if (mislukt.length > 0) {
    console.log('\nMislukt:');
    for (const m of mislukt) console.log(`  - ${m}`);
    process.exit(1);
}
