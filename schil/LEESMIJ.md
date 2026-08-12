# schil/ — het originele ontwerp, ongewijzigd

Deze drie bestanden staan hier als vastlegging van wat er is aangeleverd. Ze
draaien niet en worden niet door de tool geladen.

| Bestand | Wat het is |
|---|---|
| `Rekentool_Frankrijk.dc.html` | De presentatielaag uit Claude Design. Geen gewone HTML: `<x-dc>`, `<helmet>`, `<sc-if>`, `<sc-for>`, `{{ }}`, `onClick="{{ }}"`, `style-focus=` en een `<script type="text/x-dc">`. Vereist een `support.js` die niet is meegeleverd. |
| `kernadapter.js` | De oorspronkelijke adapter, geschreven tegen de stub. |
| `rekenkern.js` | De stub met vaste voorbeeldbedragen. Vervangen door `calc.js` in de repo-root. |

De werkende vertaling staat in `nieuw.html`, `schil.js` en `schil.css` in de
repo-root. Opmaak, flow, teksten en veldnamen komen uit het ontwerp hierboven;
de sjabloonsyntaxis en de stub zijn vervangen.

Wijzig deze map niet om de tool aan te passen: dit is het archief, niet de bron.
