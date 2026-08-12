// STUB-REKENKERN — alleen voor het prototype.
// De echte, geteste rekenkern wordt hier één-op-één onder gezet: dezelfde
// functiesignaturen, dezelfde returnvorm. De presentatielaag (de .dc.html)
// kent geen enkele tarief-, percentage- of bedragregel.
//
// Deze stub geeft UITSLUITEND de voorbeeldbedragen uit de opdracht terug,
// ongeacht de invoer. Posten zonder opgegeven voorbeeldbedrag zijn `null`
// en worden in de UI als "—" getoond.

export const META = {
  peildatum: '1 januari 2026',
  bron: 'service-public.fr en BOFiP',
  voorbeeld: true,
};

const VB = {
  koperBestaand: 31186,
  koperNieuwbouw: 8772,
  eersteWoningKorting: -2040,
  verkoperNetto: 336070,
};

export function berekenKoper(invoer = {}, verfijningen = {}) {
  const nieuwbouw = invoer.woningtype === 'nieuwbouw';
  let totaal = nieuwbouw ? VB.koperNieuwbouw : VB.koperBestaand;
  const effecten = verfijningKoper(invoer);
  if (verfijningen.eersteWoning && effecten.eersteWoning != null) {
    totaal += effecten.eersteWoning;
  }
  return {
    totaal,
    voorbeeld: true,
    posten: [
      { label: 'Overdrachtsbelasting', bedrag: null },
      { label: 'Notarishonorarium', bedrag: null },
      { label: 'Akte-, kadaster- en formaliteitskosten', bedrag: null },
      { label: 'Makelaarscourtage', bedrag: null },
    ],
  };
}

export function verfijningKoper(invoer = {}) {
  return {
    eersteWoning: invoer.woningtype === 'nieuwbouw' ? null : VB.eersteWoningKorting,
    makelaarKoper: null,
    kortingHonorarium: null,
  };
}

export function berekenVerkoper(invoer = {}, verfijningen = {}) {
  if (invoer.hoofdverblijf === 'ja') {
    return { vrijgesteld: true, netto: null, voorbeeld: true, posten: [] };
  }
  return {
    vrijgesteld: false,
    netto: VB.verkoperNetto,
    voorbeeld: true,
    posten: [
      { label: 'Verkoopprijs', bedrag: null },
      { label: 'Meerwaardebelasting', bedrag: null },
      { label: 'Sociale heffingen', bedrag: null },
      { label: 'Verkoopkosten en makelaar', bedrag: null },
    ],
  };
}

export function verfijningVerkoper() {
  return {
    verzekerdBuitenFrankrijk: null,
    aktesBewaard: null,
    verbouwdMetFacturen: null,
    meerdereVerkopers: null,
    verkoopkosten: null,
  };
}
