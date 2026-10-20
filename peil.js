/* Peil: het parameterregister van Communities Abroad (privé). De waarden staan als
 * kopie in peil/waarden.json, bijgewerkt door de Peil-agent; tests/peil.test.mjs
 * bewaakt dat de bedragen in calc.js, dmto.json en bronnen.json daarmee overeenkomen.
 * Bij elke controle alleen PEIL_STAND aanpassen (en peil/waarden.json).
 * Deze module raakt de rekenkern niet en heeft geen DOM nodig. */

export const PEIL_STAND = '2026-10-20';
/* Schakelaar voor het Peil-label (stempel en voettekstalinea). Zolang false toont de tool niets over Peil. */
export const PEIL_LABEL_AAN = true;
export const PEIL_UITLEG_URL = 'https://infofrankrijk.com/ons-manifest-hoe-wij-werken/';

const MAANDEN_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function datumDelen() {
    return /^(\d{4})-(\d{2})-(\d{2})$/.exec(PEIL_STAND);
}
export function peilStandNl() {
    const m = datumDelen();
    return m ? `${parseInt(m[3], 10)} ${MAANDEN_NL[parseInt(m[2], 10) - 1]} ${m[1]}` : PEIL_STAND;
}
export function peilStandKort() {
    const m = datumDelen();
    return m ? `${parseInt(m[3], 10)} ${MAANDEN_KORT[parseInt(m[2], 10) - 1]} ${m[1]}` : PEIL_STAND;
}
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PEIL_MERK = '<span class="peil-merk" aria-hidden="true">&#10003;</span>';

/* Compacte stempelknop: merkteken met dubbele ring en vinkje, twee korte regels, het geheel is één link naar het manifest. */
export function peilRegelHtml() {
    if (!PEIL_LABEL_AAN) return '';
    const aria = `Bedragen gecontroleerd tegen Peil, stand ${peilStandNl()}, lees hoe wij werken`;
    return `<div class="peil-stempel-rij"><a class="peil-stempel" href="${PEIL_UITLEG_URL}" target="_blank" rel="noopener" aria-label="${esc(aria)}"><svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" fill="#fff" stroke="#800000" stroke-width="1.6"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#800000" stroke-width="1"/><path d="M13.5 20.5 L18 25 L26.5 15.5" fill="none" stroke="#800000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="peil-stempel__tk" aria-hidden="true"><span class="peil-stempel__t1">Gecontroleerd tegen Peil</span><span class="peil-stempel__t2">stand ${esc(peilStandKort())}<span class="peil-pijl" aria-hidden="true">&#8599;</span></span></span></a></div>`;
}

export function peilVoetHtml() {
    if (!PEIL_LABEL_AAN) return '';
    return `${PEIL_MERK}<strong>Over de bedragen in deze tool.</strong> Alle bedragen, tarieven en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk bedrag is gecontroleerd bij de officiële bron, de laatste controle was op ${esc(peilStandNl())}. <a href="${PEIL_UITLEG_URL}" target="_blank" rel="noopener">Lees in ons manifest hoe wij werken</a>`;
}
