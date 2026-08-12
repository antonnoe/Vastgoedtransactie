// ── KOPPELVLAK ─────────────────────────────────────────────────────────────
// Dit is de ENIGE laag waar de presentatielaag bedragen vandaan haalt.
// De schil (Rekentool Frankrijk.dc.html) importeert uitsluitend dit bestand
// en kent geen enkele functienaam, veldnaam of getal van de rekenkern.
//
// Integratie: vervang de import hieronder door de echte kern en pas alleen
// `naarKern()` en de vier aanroepen aan. Verandert er iets aan de UI-velden,
// dan verandert alleen `naarKern()`. Er staat hier bewust geen tarief,
// percentage, bedrag of peildatum: de peildatum komt uit META van de kern.

import * as kern from './rekenkern.js';

// UI-veldnamen → kernveldnamen. Eén plek, één tabel.
function naarKern(ui = {}) {
  return {
    rol: ui.rol,
    postcode: ui.postcode,
    koopsom: getal(ui.koopsom),
    woningtype: ui.type,
    hoofdverblijf: ui.hoofdverblijf,
    bouwgrond: ui.bouwgrond,
    verkoopprijs: getal(ui.verkoopprijs),
    verkrijgingswijze: ui.verkrijging,
    verkrijgingswaarde: getal(ui.aankoopprijs),
    verkrijgingskosten: onbekend(ui.weetNiet, 'verkrijgingskosten') ? null : getal(ui.verkrijgingskosten),
    datumVerkrijging: ui.datumVerkrijging,
    datumVerkoop: ui.datumVerkoop,
    aantalVerkopers: ui.aantalVerkopers,
    makelaarKoop: makelaar(ui.mkKoopPartij, ui.mkKoopModus, ui.mkKoopWaarde),
    makelaarVerkoop: makelaar(ui.mkVerkPartij, ui.mkVerkModus, ui.mkVerkWaarde),
    kostenDiagnostics: onbekend(ui.weetNiet, 'diagnostics') ? null : getal(ui.diagnostics),
    kostenDoorhaling: onbekend(ui.weetNiet, 'doorhaling') ? null : getal(ui.doorhaling),
    fiscaalBuitenFrankrijk: !!ui.fiscaalBuiten,
    gemeubileerdReeelStelsel: !!ui.gemeubileerdReel,
    ziektekostenBuitenFrankrijk: !!ui.verzekerdBuiten,
    bewijsstukkenAanwezig: !!ui.aktes,
    aankoopkostenWerkelijk: ui.aktes ? getal(ui.aktesBedrag) : null,
    verbouwdMetFacturen: !!ui.verbouwd,
    verbouwingskostenFacturen: ui.verbouwd ? getal(ui.verbouwdBedrag) : null,
    eersteEigenWoning: !!ui.eersteWoning,
    kortingNotarishonorarium: !!ui.kortingHonorarium,
  };
}

const getal = v => {
  if (v == null || v === '') return null;
  const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return s === '' ? null : Number(s);
};
const onbekend = (wn, k) => !!(wn && wn[k]);
const makelaar = (partij, modus, waarde) =>
  !partij || partij === 'geen' ? { aanwezig: false } : { aanwezig: true, tenLasteVan: partij, eenheid: modus, waarde: getal(waarde) };

export function laadMeta() {
  return { peildatum: kern.META.peildatum, bron: kern.META.bron };
}

export function berekenKoper(ui, verfijningen) {
  const r = kern.berekenKoper(naarKern(Object.assign({}, ui, verfijningen)), verfijningen);
  return { totaal: r.totaal, posten: r.posten };
}

export function berekenVerkoper(ui, verfijningen) {
  const r = kern.berekenVerkoper(naarKern(Object.assign({}, ui, verfijningen)), verfijningen);
  return { vrijgesteld: !!r.vrijgesteld, netto: r.netto, posten: r.posten };
}

// Effect per verfijning, in euro's; null = de kern levert er (nog) geen getal voor.
export function effectenKoper(ui) {
  return kern.verfijningKoper(naarKern(ui));
}
export function effectenVerkoper(ui) {
  return kern.verfijningVerkoper(naarKern(ui));
}
