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
    departementaalTarief
} from './calc.js';

const hier = dirname(fileURLToPath(import.meta.url));
const dmto = JSON.parse(readFileSync(join(hier, 'dmto.json'), 'utf8'));
const meta = dmto._meta;

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

console.log(`\n${geslaagd} geslaagd, ${mislukt.length} mislukt.`);
if (mislukt.length > 0) {
    console.log('\nMislukt:');
    for (const m of mislukt) console.log(`  - ${m}`);
    process.exit(1);
}
