# Transactiekosten Frankrijk – Calculator

## Onderhoud in het kort

1. De DMTO-tarieven per département staan in `dmto.json`, overgenomen uit het DGFiP-bestand voor notarissen; `_meta.bron` bevat de volledige URL.
2. DGFiP publiceert maandelijks een nieuwe uitgave, dus controleer `https://www.impots.gouv.fr/droits-denregistrement` periodiek op een nieuwere versie.
3. Bij een nieuwe uitgave vervang je de tarieven én `_meta.bron` en `_meta.peildatum`; die peildatum is leidend en staat zichtbaar in de tool.
4. Zet nooit een tarief in de code — `calc.js` leest alles uit `dmto.json`, en een onbekende postcode geeft een melding in plaats van een terugvaltarief.
5. Draai `node test.mjs` vóór elke wijziging en commit niets met een rode test; `STATUS.md` legt per tarief vast wat geverifieerd is en wat niet.
Deze repository bevat een complete, mobielvriendelijke webapplicatie voor het berekenen van **transactiekosten bij aan- en verkoop van Frans vastgoed**.  

De tool berekent:

- Notariskosten (“frais d’acquisition” – kosten koper)
- Mutation-tarieven per département (automatisch)
- Facultatieve kosten (makelaar, géomètre, hypotheekgarantie, mainlevée, assainissement)
- Plus-value immobilière (kosten verkoper)
- Volledige Franse staffels voor fiscale en sociale vrijstellingen (22/30 jaar)
- Forfaitaire of werkelijke kosten (hybride systeem)
- Uitgebreide uitleg in een FAQ-harmonica

De tool werkt volledig in de browser (HTML + CSS + JS), zonder server of backend.

---

## 📁 Projectstructuur

/
├── index.html → de huidige, werkende interface
├── nieuw.html → de nieuwe interface, nog naast de oude
├── schil.css / schil.js → opmaak en presentatielaag van nieuw.html
├── kernadapter.js → vertaalt tussen de interface en de rekenkern
├── schil/ → het originele ontwerp, ongewijzigd, draait niet
├── styles.css → layout, ontwerp, mobiele weergave
├── calc.js → de rekenkern, plus de interface van index.html
├── dmto.json → DMTO-tarieven per département (DGFiP), met bron en peildatum
├── test.mjs → testset, draait met `node test.mjs`
└── STATUS.md → herkomst van tarieven en regels: geverifieerd, aannames, openstaand
