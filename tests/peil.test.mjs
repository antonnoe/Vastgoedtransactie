// Controle van de bedragen in de tool (calc.js, dmto.json, bronnen.json) tegen peil/waarden.json,
// de kopie van de waarden uit Peil (het parameterregister van Communities Abroad).
// peil/waarden.json wordt later door de Peil-agent bijgewerkt. Na een update draait deze test en laat zien welke constante mee moet.
// Draaien: node tests/peil.test.mjs (geen netwerk, geen afhankelijkheden).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const wortel = path.join(here, '..');
const lees = (f) => fs.readFileSync(path.join(wortel, f), 'utf8');
const kern = await import(path.join(wortel, 'calc.js'));
const peil = await import(path.join(wortel, 'peil.js'));
const WAARDEN = JSON.parse(lees('peil/waarden.json'));
const DMTO = JSON.parse(lees('dmto.json'));
const BRONNEN = JSON.parse(lees('bronnen.json'));
const indexHtml = lees('index.html');
const schilJs = lees('schil.js');
const schilCss = lees('schil.css');
const peilJs = lees('peil.js');
const UITLEG_URL = 'https://infofrankrijk.com/ons-manifest-hoe-wij-werken/';

const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const dec = (n) => Math.round(n * 1e6) / 1e6; // tegen drijvende-kommaruis
const telStd = (veld) => { const t = {}; for (const d of Object.values(DMTO.departementen)) { const k = d[veld].toFixed(2).replace('.', ','); t[k] = (t[k] || 0) + 1; } return t; };

// ---- Koppeling Peil-id naar toolconstante. Elke regel levert [wat, toolwaarde, peilwaarde]-rijen.
const KOPPELING = {
  'p.fr.csi.tarief_en_minimum': { constante: 'CSI_PCT en CSI_MINIMUM (calc.js)', vergelijk: (w) => [['tarief', kern.CSI_PCT, w && w.tarief_procent], ['minimum per akte', kern.CSI_MINIMUM, w && w.minimum_eur]] },
  'p.fr.dmto.departementaal_primo': {
    constante: 'dmto.json, veld primo per département',
    vergelijk: (w) => {
      const afw = Object.entries(DMTO.departementen).filter(([, d]) => d.primo !== (w && w.standaard_primo_accedant)).map(([k, d]) => `${k}=${d.primo}`).sort();
      return [['primo-tarief, afwijkende départements', ['36=' + (w && w.indre_36), '73=' + (w && w.savoie_73)].sort(), afw.map((x) => x.replace(/^(\d+)=([\d.]+)$/, (m, k, v) => `${k}=${Number(v)}`))]];
    },
  },
  'p.fr.dmto.departementaal_standaard': { constante: 'dmto.json, veld std per département', vergelijk: (w) => [['aantal départements per tarief', telStd('std'), w && Object.fromEntries(Object.entries(w).filter(([k]) => /^\d/.test(k)))]] },
  'p.fr.dmto.frais_assiette': { constante: 'dmto.json _meta.frais_assiette_pct_van_departementaal', vergelijk: (w) => [['frais d\'assiette', DMTO._meta.frais_assiette_pct_van_departementaal, w]] },
  'p.fr.dmto.taxe_communale': { constante: 'dmto.json _meta.taxe_communale_pct', vergelijk: (w) => [['taxe communale', DMTO._meta.taxe_communale_pct, w]] },
  'p.fr.notaris.emolumenten_schaal': {
    constante: 'EMOLUMENTEN_TRANCHES (calc.js)',
    vergelijk: (w) => [
      ['trancheschaal', kern.EMOLUMENTEN_TRANCHES.map((t) => ({ tot: t.grens === Infinity ? null : t.grens, tarief: dec(t.pct * 100) })), Array.isArray(w) ? w.map((t) => ({ tot: t.tot, tarief: t.tarief })) : null],
      // Het register noemt bij dit voorbeeld 2.460,74; de eigen toelichting (6.500 x 3,870 % + 10.500 x 1,596 % + 43.000 x 1,064 % + 190.000 x 0,799 %) komt uit op 2.394,75. Hier staat de som die klopt; zie de terugmelding.
      ['rekenvoorbeeld uit Peil: emolumenten over 250.000 euro', Math.round(kern.berekenEmolumenten(250000) * 100) / 100, 2394.75],
    ],
  },
  'p.fr.notaris.remise_drempel_en_maximum': { constante: 'REMISE_DREMPEL en REMISE_MAX_PCT (calc.js)', vergelijk: (w) => [['drempel', kern.REMISE_DREMPEL, w && w.vanaf], ['maximum procent', kern.REMISE_MAX_PCT, w && w.maximum_procent]] },
  'p.fr.vefa.tpf_tarief': { constante: 'TPF_VEFA_PCT (calc.js)', vergelijk: (w) => [['TPF bij VEFA in procent', kern.TPF_VEFA_PCT, w]] },
  'p.fr.tva.tarief_algemeen': { constante: 'TVA_PCT (calc.js)', vergelijk: (w) => [['btw', kern.TVA_PCT, w]] },
  'p.fr.ps.taux_global': { constante: 'TARIEF_PS_PCT (calc.js)', vergelijk: (w) => [['prélèvements sociaux in procent', kern.TARIEF_PS_PCT, w == null ? null : dec(w * 100)]] },
  'p.xb.deruyter.prelevement_solidarite': { constante: 'TARIEF_PS_DE_RUYTER_PCT (calc.js)', vergelijk: (w) => [['prélèvement de solidarité in procent', kern.TARIEF_PS_DE_RUYTER_PCT, w == null ? null : dec(w * 100)]] },
  'p.fr.pv.tarief_ir': { constante: 'TARIEF_IR_PCT (calc.js)', vergelijk: (w) => [['tarief inkomstenbelasting', kern.TARIEF_IR_PCT, w]] },
  'p.fr.pv.abattement_ir_per_jaar': { constante: 'ABATTEMENT_IR_PER_JAAR en ABATTEMENT_IR_JAAR_22 (calc.js)', vergelijk: (w) => [['jaar 6 tot 21', kern.ABATTEMENT_IR_PER_JAAR, w && w.jaar_6_tot_21], ['jaar 22', kern.ABATTEMENT_IR_JAAR_22, w && w.jaar_22], ['totaal na 22 jaar', 100, w && w.jaar_6_tot_21 * 16 + w.jaar_22]] },
  'p.fr.pv.abattement_ps_per_jaar': { constante: 'ABATTEMENT_PS_* (calc.js)', vergelijk: (w) => [['jaar 6 tot 21', kern.ABATTEMENT_PS_PER_JAAR, w && w.jaar_6_tot_21], ['jaar 22', kern.ABATTEMENT_PS_JAAR_22, w && w.jaar_22], ['jaar 23 tot 30', kern.ABATTEMENT_PS_PER_JAAR_NA_22, w && w.jaar_23_tot_30]] },
  'p.fr.pv.forfait_aankoopkosten': { constante: 'FORFAIT_AANKOOPKOSTEN_PCT (calc.js)', vergelijk: (w) => [['forfait aankoopkosten', kern.FORFAIT_AANKOOPKOSTEN_PCT, w]] },
  'p.fr.pv.forfait_werkzaamheden': { constante: 'FORFAIT_VERBOUWING_PCT (calc.js)', vergelijk: (w) => [['forfait verbouwing', kern.FORFAIT_VERBOUWING_PCT, w]] },
  'p.fr.pv.surtaxe_barema': {
    constante: 'SURTAXE_DREMPEL en SURTAXE_BAREME (calc.js)',
    vergelijk: (w) => {
      const eindig = [...new Set(kern.SURTAXE_BAREME.filter((t) => t.correctie !== null).map((t) => t.tot))];
      const pcts = [...new Set(kern.SURTAXE_BAREME.map((t) => dec(t.pct * 100)))];
      return [['drempel', kern.SURTAXE_DREMPEL, w && w.drempel], ['tranchegrenzen', eindig, w && w.tranchegrenzen], ['tarieven in procent', pcts, w && w.tarieven_procent]];
    },
  },
  'p.fr.pv.terugname_afschrijvingen_vanaf': { constante: 'TERUGNAME_AFSCHRIJVINGEN_VANAF (calc.js)', vergelijk: (w) => [['datum', kern.TERUGNAME_AFSCHRIJVINGEN_VANAF, w]] },
  'p.fr.pv.vrijstelling_eu_eer': { constante: 'tekst in bronnen.json (de tool rekent dit regime niet door)', vergelijk: (w) => [['bedrag staat in bronnen.json', true, w != null && JSON.stringify(BRONNEN).includes(`tot ${Number(w).toLocaleString('nl-NL')} euro`)]] },
  // Gebruikersinvoer, geen constante: de tool laat de koopsom door de gebruiker invullen en noemt DVF alleen als naslag.
  'p.fr.markt.dvf_transactieprijzen': { constante: 'gebruikersinvoer (index.html, koopsom en aankoopprijs)', vergelijk: () => [['koopsom is een invoerveld', true, /id="veld-koopsom"/.test(indexHtml)]] },
};

// Parameters met status te_verifieren: waarde null in Peil, de tool houdt zijn waarde en toont die als aanname of benadering.
// Krijgt Peil later een waarde, dan vergelijkt deze test hem met de constante hieronder.
const NOG_TE_VERIFIEREN = {
  'p.fr.notaris.debours_forfait': { constante: 'DEBOURS_FORFAIT (calc.js)', toolwaarde: () => kern.DEBOURS_FORFAIT },
  'p.fr.vastgoed.houdbaarheidstermijn_tarieven': { constante: 'HOUDBAAR_CONTROLEREN_MAANDEN (calc.js)', toolwaarde: () => kern.HOUDBAAR_CONTROLEREN_MAANDEN },
};

const fouten = [];
const fout = (m) => fouten.push(m);

// ---- Vaste onderdelen: stempel, voettekst, datum
{
  const nl = peil.peilStandNl();
  const kort = peil.peilStandKort();
  if (peil.PEIL_UITLEG_URL !== UITLEG_URL) fout(`PEIL_UITLEG_URL is ${peil.PEIL_UITLEG_URL}, verwacht ${UITLEG_URL}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(peil.PEIL_STAND)) fout(`PEIL_STAND (${peil.PEIL_STAND}) is geen datum als JJJJ-MM-DD.`);
  if (peil.PEIL_LABEL_AAN !== true) fout('PEIL_LABEL_AAN moet true zijn: de tool voldoet aan de voorwaarden voor het Peil-label.');
  if (WAARDEN.stand !== peil.PEIL_STAND) fout(`stand in peil/waarden.json is ${WAARDEN.stand}, maar PEIL_STAND in peil.js is ${peil.PEIL_STAND}.`);
  if (peil.PEIL_STAND === '2026-10-20' && (nl !== '20 oktober 2026' || kort !== '20 okt 2026')) fout(`Datumweergave klopt niet: '${nl}' en '${kort}'.`);
  const h = peil.peilRegelHtml();
  if (!h.includes(`href="${UITLEG_URL}"`) || !h.includes('target="_blank"') || !h.includes('rel="noopener"')) fout('Stempel linkt niet naar het manifest met target _blank en rel noopener.');
  if (!h.includes(`aria-label="Bedragen gecontroleerd tegen Peil, stand ${nl}, lees hoe wij werken"`)) fout('Stempel mist de aria-label met volledige datum.');
  if (!h.includes('Gecontroleerd tegen Peil</span>') || !h.includes(`stand ${kort}<span class="peil-pijl" aria-hidden="true">&#8599;</span></span>`)) fout('Stempel mist de twee korte regels met het pijltje.');
  if ((h.match(/<a /g) || []).length !== 1 || !h.includes('<svg')) fout('Stempel moet één link met inline svg zijn.');
  if (!h.includes('stroke="#800000"')) fout('De stempel gebruikt niet de kleur #800000.');
  const v = peil.peilVoetHtml();
  if (!v.startsWith('<span class="peil-merk"') || !v.includes('<strong>Over de bedragen in deze tool.</strong> Alle bedragen, tarieven en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk bedrag is gecontroleerd bij de officiële bron, de laatste controle was op ' + nl + '. <a href="' + UITLEG_URL + '" target="_blank" rel="noopener">Lees in ons manifest hoe wij werken</a>')) fout('Voettekstalinea wijkt af van het goedgekeurde ontwerp.');
  if (/(19|20) oktober 2026/.test(peilJs.replace(/\/\*[\s\S]*?\*\//g, '')) && /'(19|20) oktober 2026'/.test(peilJs)) fout('Er staat een vaste peildatum in peil.js; de datum mag alleen uit PEIL_STAND komen.');
  if (/(19|20) oktober 2026/.test(indexHtml) || /(19|20) oktober 2026/.test(schilJs)) fout('Er staat een vaste peildatum in index.html of schil.js; de datum mag alleen uit PEIL_STAND komen.');
  if (/antonnoe\.github\.io\/peil-nl-fr/.test(indexHtml + schilJs + peilJs)) fout('De tool verwijst naar de openbare Peil-site.');
  if (!/data-peil="stempel"/.test(indexHtml) || !/id="peilVoet"/.test(indexHtml)) fout('index.html mist de plek voor de stempel of de voettekstalinea.');
  // Volgorde: het voorbehoud (bronregel) staat vóór de stempel, de stempel vóór de verantwoording.
  const iB = indexHtml.indexOf('class="bronregel"'), iS = indexHtml.indexOf('data-peil="stempel"'), iV = indexHtml.indexOf('class="verantwoording"');
  if (!(iB > 0 && iB < iS && iS < iV)) fout('De stempel moet direct na het voorbehoud staan, vóór de verantwoording.');
  if (!/\.peil-pijl\s*\{/.test(schilCss) || !/\.peil-stempel\s*\{/.test(schilCss)) fout('schil.css mist de opmaak voor de stempel.');
  // Met de schakelaar uit moet het label verdwijnen (kopie van de module).
  const uit = await import('data:text/javascript,' + encodeURIComponent(peilJs.replace('PEIL_LABEL_AAN = true', 'PEIL_LABEL_AAN = false')));
  if (uit.peilRegelHtml() !== '' || uit.peilVoetHtml() !== '') fout('Met PEIL_LABEL_AAN op false moet het label volledig verdwijnen.');
  // Aannames zichtbaar voor de gebruiker
  if (!/data-toon="aannameDebours"/.test(indexHtml) || !/data-toon="aannameVefa"/.test(indexHtml)) fout('index.html mist de zichtbare aannametekst voor débours of het VEFA-tarief.');
  if (!/data-tekst="verouderdGrens"/.test(indexHtml)) fout('De waarschuwing bij een verouderde tarieventabel noemt de eigen houdbaarheidsgrens niet.');
}

// ---- Parameters
const lijst = WAARDEN.parameters || [];
if (!lijst.length) fout('peil/waarden.json bevat geen parameters.');
const perId = new Map(lijst.map((p) => [p.id, p]));

for (const [id, koppeling] of Object.entries(KOPPELING)) {
  const p = perId.get(id);
  if (!p) { fout(`${id}: staat niet in peil/waarden.json, maar de tool gebruikt hem (${koppeling.constante}).`); continue; }
  if (p.status && p.status !== 'vastgesteld' && p.waarde === null) { fout(`${id}: heeft in Peil status ${p.status} en geen waarde; zet hem bij NOG_TE_VERIFIEREN in deze test.`); continue; }
  for (const [wat, app, waarde] of koppeling.vergelijk(p.waarde)) {
    if (!gelijk(app, waarde)) fout(`${id} (${p.naam}), ${wat}: de tool heeft ${JSON.stringify(app)}, peil/waarden.json heeft ${JSON.stringify(waarde)}. Waar: ${koppeling.constante}.`);
  }
  console.log(`ok   ${id} <-> ${koppeling.constante}`);
}
for (const [id, k] of Object.entries(NOG_TE_VERIFIEREN)) {
  const p = perId.get(id);
  if (!p) { fout(`${id}: staat niet in peil/waarden.json, maar de tool gebruikt hem (${k.constante}).`); continue; }
  if (p.waarde === null) {
    if (p.status !== 'te_verifieren') fout(`${id}: waarde is null maar status is ${JSON.stringify(p.status)}; verwacht te_verifieren.`);
    else console.log(`ok   ${id}: te_verifieren, niet vergeleken (tool: ${JSON.stringify(k.toolwaarde())}, ${k.constante})`);
  } else if (!gelijk(k.toolwaarde(), p.waarde)) {
    fout(`${id} (${p.naam}): de tool heeft ${JSON.stringify(k.toolwaarde())}, peil/waarden.json heeft ${JSON.stringify(p.waarde)}. Waar: ${k.constante}.`);
  } else console.log(`ok   ${id} <-> ${k.constante}`);
}
const bekend = new Set([...Object.keys(KOPPELING), ...Object.keys(NOG_TE_VERIFIEREN)]);
const onbekend = lijst.filter((p) => !bekend.has(p.id)).map((p) => p.id);
if (onbekend.length) fout(`Parameters in peil/waarden.json zonder koppeling in deze test: ${onbekend.join(', ')}.`);

if (fouten.length) {
  console.log(`\n${fouten.length} afwijking(en) tussen de tool en peil/waarden.json:`);
  fouten.forEach((m) => console.log(`FOUT ${m}`));
  process.exit(1);
}
console.log(`\nAlle ${bekend.size} gebruikte parameters komen overeen met peil/waarden.json (stand ${peil.PEIL_STAND}).`);
