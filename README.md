# Transactiekosten Frankrijk – Calculator
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
├── index.html → hoofdapplicatie (interface)
├── styles.css → layout, ontwerp, mobiele weergave
├── calc.js → volledige functionaliteit & berekeningen
├── dmto.json → DMTO-tarieven per département (DGFiP), met bron en peildatum
├── test.mjs → testset, draait met `node test.mjs`
└── STATUS.md → herkomst van tarieven en regels: geverifieerd, aannames, openstaand
