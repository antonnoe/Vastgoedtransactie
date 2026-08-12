# STATUS

Herkomst van elk tarief, elk bedrag en elke termijn in deze tool.
Bijgewerkt: 2026-08-12, na de koppeling van de nieuwe schil op de rekenkern.

**Belangrijke beperking vooraf.** De uitvoeromgeving waarin deze wijziging is
gemaakt, blokkeert uitgaand netwerkverkeer naar `impots.gouv.fr`,
`bofip.impots.gouv.fr`, `legifrance.gouv.fr`, `economie.gouv.fr` en
`service-public.fr` (de proxy geeft 403 op CONNECT). Er is dus geen enkele
primaire bron rechtstreeks opgehaald tijdens deze wijziging. Wat hieronder
onder GEVERIFIEERD staat, is geverifieerd op een andere manier: door de
opdrachtgever letterlijk aangeleverde brontekst, of door een rekenkundige
controle tegen onafhankelijk aangeleverde uitkomsten uit de primaire bron. Dat
is zwakker dan zelf de bron lezen. Wie deze tool onderhoudt, doet er goed aan
elk punt hieronder alsnog tegen de bron te leggen.

---

## GEVERIFIEERD

### DMTO per departement — dmto.json

- **Bron:** DGFiP, "Droits d'enregistrement et taxe de publicité foncière :
  taux, abattements de base et réductions de taux applicables au 1er juin
  2026", `https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_2026-06.pdf`
- **Overzichtspagina:** `https://www.impots.gouv.fr/droits-denregistrement`
- **Peildatum:** 1 juni 2026, vastgelegd in `_meta.peildatum` van `dmto.json`
  en zichtbaar in de interface onder de specificatietabel.
- **Wijze van verificatie:** de tabel is door de opdrachtgever letterlijk uit
  het DGFiP-bestand overgenomen en integraal aangeleverd. Ik heb het bestand
  zelf niet kunnen openen (zie beperking hierboven).
- **Grondslag:** art. 1594 D CGI en art. 116 II van wet 2025-127 van
  14 februari 2025.
- Er is niet vastgesteld of `dmto_2026-06.pdf` de meest recente uitgave is; de
  opdracht vroeg te controleren of er iets nieuwers is dan `dmto_2026-02.pdf`,
  en 2026-06 is nieuwer, maar de overzichtspagina is niet raadpleegbaar
  geweest. **DGFiP publiceert maandelijks. Dit bestand moet daarom periodiek
  tegen de overzichtspagina worden gecontroleerd** en bij een nieuwe uitgave
  worden vervangen, inclusief `_meta.bron` en `_meta.peildatum`.

### Samenstelling van het totale DMTO

- Departementaal tarief over de prijs, plus 1,20 % gemeentelijke taxe over de
  prijs, plus 2,37 % frais d'assiette et de recouvrement over het
  departementale deel. Afgerond op hele euro's.
- **Verificatie:** de drie samengestelde tarieven die de opdrachtgever uit de
  bron gaf, komen exact uit de formule: 5,00 → 6,3185 %, 4,50 → 5,8067 %,
  3,80 → 5,0901 %. Dit is als aparte assertion in `test.mjs` vastgelegd.
- **Wetsartikelen (opdrachtgever, augustus 2026):** de gemeentelijke opslag
  berust op art. 1584 CGI, vastgesteld op 1,20 %; voor gemeenten die daar niet
  onder vallen geldt art. 1595 bis met hetzelfde standaardtarief. De frais
  d'assiette berusten op art. 1647 V-a CGI, 2,37 % bovenop het departementale
  deel dat op grond van art. 1594 A wordt geheven. Daarmee heeft ook de
  samenstelling zelf een grondslag, en niet alleen de uitkomst ervan.

### Taxe de publicité foncière bij nieuwbouw — samenstelling

- Het gerekende tarief is 0,715 %. Dat is geen los getal: art. 1594 F quinquies
  CGI geeft 0,70 %, en art. 1647 V-b CGI geeft daarbovenop frais d'assiette van
  **2,14 %** in plaats van de 2,37 % die bij de gewone tarieven hoort, juist
  omdat het tarief hier 0,70 bedraagt.
- **Verificatie:** 0,70 × 1,0214 = 0,71498, afgerond 0,715 — het gepubliceerde
  tarief. Met 2,37 % zou er 0,717 uitkomen, met een weggelaten opslag 0,700.
  Alle drie zijn in `test.mjs` als assertion vastgelegd, zodat het VEFA-deel
  niet ongemerkt op de 2,37 van de gewone tarieven kan worden gezet.
- De tool rekent met het gepubliceerde 0,715 en niet met de opnieuw uitgerekende
  0,71498. Dat scheelt bij een prijs van een miljoen euro twintig cent. Het
  gepubliceerde getal is wat de notaris hanteert; hier iets anders van maken zou
  een nauwkeurigheid suggereren die de bron niet geeft.
- **Deze samenstelling staat niet in het paneel.** De post `vefa.tpf` houdt in
  `bronnen.json` zijn eigen tekst en bronnaam (economie.gouv.fr). Ik had de
  artikelen erin gezet, maar dan zou het paneel art. 1647 V-b toeschrijven aan
  een bron die daar niet voor is aangeleverd. Wil je de samenstelling wél in het
  paneel, geef dan een Legifrance-URL voor art. 1647 V-b, dan gaat de bronnaam
  mee.

### Contribution de sécurité immobilière — art. 879, 881 K en 881 F CGI

- Verschuldigd door wie om de formaliteiten van art. 878 CGI verzoekt
  (art. 879). Het tarief staat in art. 881 K: uniform 0,10 % over de in de akte
  vermelde bedragen. Art. 881 F stelt een ondergrens van **15 euro per akte**.
- **Verificatie:** wetsartikelen aangeleverd door de opdrachtgever, augustus
  2026. Die ondergrens ontbrak in de tool: onder een prijs van 15.000 euro
  rekende hij te weinig. Nu ingebouwd, met assertions onder en boven de grens
  en op de grens zelf.

### Emolumenten van de notaris

- Degressieve schijven 3,870 % / 1,596 % / 1,064 % / 0,799 % met grenzen
  6.500 / 17.000 / 60.000 euro. Tarif réglementé, tableau 5 van bijlage 4-7 bij
  het Code de commerce (art. A444-53).
- **Verificatie:** deze schijven reproduceren de onafhankelijk door de
  opdrachtgever opgegeven uitkomst van 3.593,25 euro over 400.000 euro tot op
  de cent. Deze waarde stond al in de bestaande code en is dus niet nieuw.

### Taxe sur les plus-values immobilières élevées — art. 1609 nonies G CGI

Ingebouwd barème (PV = belastbare meerwaarde na abattement voor bezitsduur):

| Tranche | Heffing |
|---|---|
| 50.001 – 60.000 | 2 % PV − (60.000 − PV) × 1/20 |
| 60.001 – 100.000 | 2 % PV |
| 100.001 – 110.000 | 3 % PV − (110.000 − PV) × 1/10 |
| 110.001 – 150.000 | 3 % PV |
| 150.001 – 160.000 | 4 % PV − (160.000 − PV) × 15/100 |
| 160.001 – 200.000 | 4 % PV |
| 200.001 – 210.000 | 5 % PV − (210.000 − PV) × 20/100 |
| 210.001 – 250.000 | 5 % PV |
| 250.001 – 260.000 | 6 % PV − (260.000 − PV) × 25/100 |
| boven 260.000 | 6 % PV |

- **Primaire bron, inmiddels geverifieerd:** Légifrance, Code général des
  impôts, artikel 1609 nonies G, versie in werking sinds 01/01/2024, gewijzigd
  bij wet 2023-1322 van 29 december 2023,
  `https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048806252`.
  Alle tien tranches en alle vier afvlakkingsfactoren komen exact overeen met
  de hierboven weergegeven tabel. Deze controle is door de opdrachtgever
  uitgevoerd, omdat Légifrance vanuit de uitvoeromgeving niet bereikbaar is.
- **Twee aanvullende controles die beide slagen:**
  1. De twee uitgewerkte voorbeelden uit BOFiP `BOI-RFPI-TPVIE-20` komen exact
     uit: 52.500 → 675 euro, 103.400 → 2.442 euro.
  2. De afvlakkingsformules maken het barème op alle negen tranchegrenzen
     continu. Elke transcriptiefout in een tariefpercentage of in een
     afvlakkingsfactor zou op minstens één grens een sprong opleveren. Beide
     controles staan als assertions in `test.mjs`.
- Drempel van 50.000 euro per verkoper, getoetst na verdeling van de
  meerwaarde naar rato over het opgegeven aantal verkopers. Niet van toepassing
  op bouwgrond (terrain à bâtir); daarvoor is een aanvinkveld toegevoegd.

### Abattement voor bezitsduur

- IR: 6 % per jaar voor de jaren 6 t/m 21, 4 % in jaar 22, daarmee 100 % na
  22 jaar. Sociale lasten: 1,65 % per jaar voor de jaren 6 t/m 21, 1,60 % in
  jaar 22, 9 % per jaar voor de jaren 23 t/m 30, daarmee 100 % na 30 jaar.
- **Verificatie:** de zes ijkpunten uit de opdracht komen alle exact uit
  (21 jaar → 96,0 / 26,4; 22 jaar → 100 / 28,0; 23 jaar → 100 / 37,0), en de
  reeks sluit intern op precies 100 % op beide eindpunten.
- De gerepareerde rekenfout: de oude code gaf bij precies 22 jaar 29,65 % voor
  de sociale lasten in plaats van 28,0 %.

### Bezitsduur

- Volle perioden van twaalf maanden van datum tot datum. De twee jaartalvelden
  zijn vervangen door twee datumvelden. Aankoop 15-12-2003 met verkoop
  10-01-2026 geeft 22 volle jaren; dat is als assertion vastgelegd.

### Postcode naar departement

- Reeksen zoals door de opdrachtgever opgegeven: 20000–20199 → 2A,
  20200–20999 → 2B, 97100–97199 → 971, 97200–97299 → 972, 97300–97399 → 973,
  97400–97499 → 974, 97600–97699 → 976, overige postcodes de eerste twee
  cijfers.
- Postcodes die niet in `dmto.json` voorkomen, waaronder 975
  Saint-Pierre-et-Miquelon, 977, 978 en 98xxx, leveren geen berekening maar de
  melding dat het tarief voor dat gebied niet in de DGFiP-tabel staat. Er wordt
  nooit stilzwijgend teruggevallen op een standaardtarief.

### Primo-accédant

- Het primo-tarief wordt uitsluitend uit het veld `primo` in `dmto.json`
  gelezen en nooit afgeleid door 0,5 punt van het standaardtarief af te
  trekken. Departement 65 (Hautes-Pyrénées) bewijst waarom: standaard 4,50 en
  primo 3,80, een verschil van 0,70 punt. Dit is als assertion vastgelegd.
- Grondslag zoals opgegeven bij de bron: art. 116 II van wet 2025-127 van
  14 februari 2025.

### Korting op de emolumenten van de notaris

- Ten hoogste 20 % over het deel van de grondslag vanaf 100.000 euro. De
  notaris is niet verplicht die korting te geven, dus staat zij in de tool
  standaard uit.
- **Bron:** economie.gouv.fr, "Achat d'un bien immobilier : quels frais de
  notaire devez-vous payer ?",
  `https://www.economie.gouv.fr/particuliers/gerer-mon-argent/investir-dans-limmobilier/achat-dun-bien-immobilier-quels-frais-de-notaire-devez-vous-payer`
- **Wijze van verificatie:** door de opdrachtgever tegen de bron gelegd, met
  de bevestiging dat de implementatie klopt. Ik heb de pagina zelf niet kunnen
  openen; economie.gouv.fr is vanuit de uitvoeromgeving geblokkeerd.
- De korting wordt toegepast op de emolumenten die aan het deel boven de
  drempel zijn toe te rekenen, dus `emolumenten(prijs)` min
  `emolumenten(100.000)`, en verlaagt daarmee ook de btw-grondslag omdat de
  btw over de emolumenten gaat.

### Terugname van afschrijvingen bij gemeubileerde verhuur

- De afschrijvingen die tijdens gemeubileerde verhuur onder het reële stelsel
  zijn afgetrokken, worden bij de verkoop teruggenomen in de meerwaarde. Dit
  geldt voor verkopen vanaf **15 februari 2025**, op grond van artikel 84 van
  wet 2025-127 van 14 februari 2025.
- **Bron:** impots.gouv.fr, "Je vends mon bien immobilier, vais-je payer de la
  plus-value immobilière ?", bijgewerkt 7 juli 2026,
  `https://www.impots.gouv.fr/particulier/questions/je-vends-mon-bien-immobilier-vais-je-payer-de-la-plus-value-immobiliere`
- **Wijze van verificatie:** door de opdrachtgever tegen de bron gelegd.
  impots.gouv.fr is vanuit de uitvoeromgeving geblokkeerd.
- De ingangsdatum staat als `TERUGNAME_AFSCHRIJVINGEN_VANAF` in `calc.js`. De
  signalering verschijnt alleen bij een verkoopdatum op of na die datum. Dit is
  de enige signalering met een datum erin, en dat kan omdat die datum nu
  primair vaststaat. De datum wordt gebruikt om te poorten, niet getoond: de
  tekst van de signalering blijft cijfervrij.
- Bij een ontbrekende of onleesbare verkoopdatum verschijnt de signalering wel.
  Te vaak waarschuwen is hier de veiligere fout.

### Reikwijdte van het forfait voor kosten van de verkrijging

- Het forfait van 7,5 % geldt uitsluitend bij een verkrijging onder bezwarende
  titel. Bij een geërfd of geschonken pand bestaat dat forfait niet en tellen
  alleen de werkelijke kosten: de betaalde overdrachtsbelasting, de kosten van
  akte en aangifte, en zo nodig zegel- en publicatiekosten.
- **Grondslag:** art. 150 VB II 2° en 3° CGI, uitgewerkt in art. 41 duovicies I
  van bijlage III,
  `https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006297889`
- **Wijze van verificatie:** door de opdrachtgever tegen de bron gelegd.
  Légifrance is vanuit de uitvoeromgeving geblokkeerd.
- De tool vraagt nu hoe het pand is verkregen. Bij erven of schenken vervalt de
  keuzelijst tussen forfait en werkelijke kosten en blijft alleen het veld voor
  de werkelijke kosten over. Erven en schenken zijn beide verkrijgingen om
  niet en worden identiek behandeld.
- Dit was een correctheidsgat: tot deze wijziging kende de tool ook aan een
  geërfd pand het forfait van 7,5 % toe, wat de belastbare meerwaarde te laag
  maakte.

### Reikwijdte van het forfait voor werkzaamheden

- Het forfait van 15 % geldt uitsluitend bij bebouwd onroerend goed en niet bij
  kale grond, en is een keuzemogelijkheid voor wie het pand langer dan vijf jaar
  bezit.
- **Grondslag:** BOFiP `BOI-RFPI-PVI-20-10-20-20`.
- **Wijze van verificatie:** door de opdrachtgever tegen de bron gelegd. BOFiP
  is vanuit de uitvoeromgeving geblokkeerd.
- Het forfait is gepoort op het bestaande aanvinkveld bouwgrond, dat al de
  taxe op hoge meerwaarden uitsloot. Ook hier gold tot deze wijziging het
  forfait ten onrechte, wat de meerwaarde op kale grond te laag maakte.

### Lettertypen

- Poppins en Mulish staan in `fonts/` en worden niet meer bij Google
  opgehaald. Beide vallen onder de SIL Open Font License 1.1, die
  herdistributie toestaat; de licentieteksten staan naast de bestanden.
  Herkomst: de npm-pakketten `@fontsource/poppins` en `@fontsource/mulish`,
  versie 5.3.0, latijnse subset, woff2, de vier gewichten die de tool gebruikt.
- **Verificatie:** in de browser gecontroleerd dat de pagina geen enkel extern
  verzoek meer doet en dat beide families lokaal laden.

### Contrast

- Het bijschriftgrijs is van `#888888` naar `#6b6b6b` gegaan. Berekend volgens
  de WCAG-formule voor relatieve luminantie: `#888888` op wit geeft 3,54 op 1
  en haalt de eis van 4,5 op 1 dus niet; `#6b6b6b` geeft 5,33 op 1. Ook
  gecontroleerd: `#800000` op wit geeft 10,95 op 1, wit op `#800000` idem, en
  het groen `#1b7a3d` van een gunstige gevoeligheid geeft 5,39 op 1.

---

## AANNAMES

1. **Notariskosten bestaande bouw over 400.000 euro: 31.185,90 euro, niet
   31.191,90 euro.** De opdracht noemde in taak 6 de waarde 31.191,90. Die komt
   uit 6,32 % × 400.000 = 25.280 aan DMTO. De componentformule die taak 2
   voorschrijft, en die door de drie aangeleverde controletarieven wordt
   bevestigd, geeft 20.000 + 4.800 + 474 = 25.274, dus 31.185,90. Het verschil
   is 6 euro en komt doordat 6,32 % de afgeronde weergave is van 6,3185 %. Ik
   heb de componentformule aangehouden, omdat dat is wat er in de akte gebeurt,
   en de testwaarde daarop gezet. **Controleer dit als je de andere keuze
   wilt.**
2. **Débours: 1.200 euro forfaitair — `debours`.** Deze post staat in de opbouw
   expliciet als "schatting, geen tarief" gemarkeerd, naast de posten die wel
   een wettelijk tarief zijn. Dit bedrag stond al in de bestaande code en is
   overgenomen, ook in de nieuwe VEFA-opbouw. Het is een schatting van
   kadaster-, uittreksel- en formaliteitskosten. Er is geen wettelijk tarief en
   er komt er ook geen; daarom staat deze post in `bronnen.json` op
   `geentarief` en niet op `teverifieren`. Er valt niets na te gaan, alleen
   beter te onderbouwen. Dat de VEFA-uitkomst met dit bedrag precies op de door
   de opdracht genoemde 8.771,90 euro uitkomt, bevestigt hooguit dat de opdracht
   van hetzelfde forfait uitging.
3. **Btw van 20 % over de emolumenten — `emolumenten.btw`.** Het tarief zelf
   staat vast: de emolumenten zijn een dienst tegen het algemene tarief. Er is
   geen eigen bepaling in het CGI die dit voor notarisemolumenten regelt, en die
   komt er ook niet. Deze post staat daarom in `bronnen.json` op `geentarief` en
   niet op `teverifieren`: er valt niets meer na te gaan. In het paneel staat
   hij neutraal, niet in amber.

   De taxe de publicité foncière bij VEFA en de contribution de sécurité
   immobilière stonden hier eerder ook onder. Beide hebben inmiddels een
   wetsartikel en staan onder GEVERIFIEERD. Dat de VEFA-uitkomst met deze
   getallen precies op de door de opdracht genoemde 8.771,90 euro uitkomt, blijft
   een consistentiecontrole en is geen bronverificatie.
4. **Grondslag van de surtaxe.** De heffing wordt toegepast op de belastbare
   meerwaarde ná het IR-abattement voor bezitsduur, niet na het afwijkende
   abattement voor de sociale lasten. Dit volgt uit de formulering in de
   opdracht ("beoordeeld na het abattement voor bezitsduur") in combinatie met
   het feit dat de heffing een inkomstenbelastingheffing is, maar is niet uit
   BOFiP bevestigd.
   **Let op, dit verklaart een verschil met de opdracht.** De opdracht schatte
   dat de surtaxe op het standaardscenario "ruim drieduizend euro" scheelt. Op
   het standaardscenario komt de tool uit op 1.813 euro. Het bedrag van 3.885
   euro dat bij "ruim drieduizend" past, is precies wat je krijgt als je de
   heffing over de bruto meerwaarde van 129.500 euro rekent zonder eerst het
   IR-abattement van 30 % toe te passen. De ingebouwde volgorde volgt de regel
   die de opdracht zelf voorschrijft, niet de schatting.
5. **Afronding van de surtaxe.** Per verkoper afgerond op hele euro's, daarna
   vermenigvuldigd met het aantal verkopers. Bij één verkoper doet de keuze er
   niet toe en beide BOFiP-voorbeelden zijn gehele bedragen, dus deze keuze is
   niet door de voorbeelden getoetst.
6. **Verdeling over verkopers naar rato.** De meerwaarde wordt gelijk verdeeld
   over het opgegeven aantal verkopers. In werkelijkheid volgt de verdeling de
   eigendomsverhouding, die ongelijk kan zijn. Er is geen invoerveld voor
   ongelijke aandelen.
7. **Aftrekbare verkoopkosten.** Landmeter/diagnostics en mainlevée worden nu
   ook van de meerwaardegrondslag afgetrokken, op grond van art. 150 VA CGI met
   art. 41 duovicies H van bijlage III zoals de opdracht aangeeft. Dat de
   opsomming in die bijlage precies deze twee posten dekt, is niet uit de bron
   geverifieerd. Het aftrekbare bedrag is het door de gebruiker ingevulde
   werkelijke bedrag; er is geen controle op de eis dat de kosten door de
   verkoper zijn gedragen en met bewijsstukken zijn te staven.
8. **De percentages 19 %, 17,2 % / 7,5 %, 7,5 % en 15 % zelf.** Alle vier
   stonden al in de bestaande code en zijn ongewijzigd overgenomen. Niet
   opnieuw tegen een primaire bron gelegd. Let op het onderscheid: van de twee
   forfaits is inmiddels wél primair vastgesteld *wanneer* zij gelden (zie
   GEVERIFIEERD), maar niet dat de percentages 7,5 en 15 nog actueel zijn.
9. **De vier signaleringen uit blok B zijn niet primair geverifieerd.** Dat is
   precies waarom het signaleringen zijn en geen berekeningen: ze benoemen dat
   een situatie speelt en verwijzen door, zonder één bedrag, percentage of
   termijn. Per signalering wat er níet vaststaat:
   - *Niet-ingezetene.* Dat er een afwijkend regime bestaat (art. 244 bis A
     CGI), een vrijstelling voor EU- en EER-onderdanen die eerder fiscaal
     inwoner waren (art. 150 U II 2° CGI), een regeling voor de voormalige
     hoofdwoning, en in gevallen een plicht tot een fiscaal vertegenwoordiger,
     is uit de opdracht overgenomen. De artikelnummers zijn niet tegen
     Légifrance gecontroleerd. Tarieven, drempelbedragen, de
     bezitsduurvoorwaarde en de omzetgrens waarboven een vertegenwoordiger
     verplicht is, staan bewust niet in de tool.
   - *Gemeubileerde verhuur onder het reële stelsel.* Deze staat inmiddels
     onder GEVERIFIEERD, inclusief de ingangsdatum, en de signalering poort
     daarop. Wat hier open blijft: hoe groot de terugname is, hangt af van wat
     er is afgeschreven, en dat rekent de tool niet uit. De signalering zegt
     alleen dat de uitkomst te laag is, zonder bedrag.
   - *Overige vrijstellingen.* Dat er vrijstellingen bestaan bij een lage
     verkoopprijs en voor gepensioneerden en invaliden onder
     inkomensvoorwaarden, is uit de opdracht overgenomen. De prijsgrens en de
     inkomens- en vermogensgrenzen zijn niet vastgesteld en staan er niet in.
   - *Bewaaradvies.* Puur een advies, geen fiscale bewering, dus hier valt
     niets te verifiëren. Het forfait waar het naar verwijst, zit al in de
     berekening.
10. **De grondregel en de artikelverwijzingen botsen.** De grondregel verbiedt
    cijfers in een signalering; B1 vraagt om `art. 244 bis A CGI`, dat cijfers
    bevat. Ik heb de lopende tekst gescheiden van een apart veld `artikelen`.
    De cijfertoets uit F1 controleert alleen titel en tekst. Redenering: een
    wetsartikelnummer is geen bedrag, geen percentage en geen termijn, en dus
    niet wat de grondregel wil weren. **Als je dat anders ziet, haal dan het
    veld `artikelen` leeg; de toets hoeft daarvoor niet te wijzigen.**
11. **Landmeter en diagnostics zijn gesplitst.** Ze zaten in één veld. D3 somt
    ze als aparte posten op en het zijn in de praktijk twee facturen, dus het
    zijn nu twee velden. Dat verandert geen enkele rekenregel: beide zijn
    aftrekbare verkoopkosten en tellen op dezelfde manier mee.
12. **De maatstaf per gevoeligheid is een keuze van mij.** De courtagekeuze
    raakt in dit model alleen de grondslag van de notaris en dus de koper, niet
    de netto-opbrengst van de verkoper. Gemeten op de netto-opbrengst kwam die
    gevoeligheid op nul uit en verdween hij. Elke gevoeligheid wordt daarom
    gemeten op de maatstaf waar het verschil landt, en de tool zegt er per
    regel bij welke dat is.
13. **De verkrijgingskosten bij erven of schenken lopen via
    `aankoopkostenEigen` met modus `werkelijk`.** De kern heeft daar geen eigen
    veld voor. `aankoopkostenEigen` accepteert nu `null` als onbekend, naast een
    bedrag; de standaardwaarde is `null` geworden in plaats van nul. Nul en
    onbekend blijven van elkaar te onderscheiden, ook door de URL heen. Let op
    de asymmetrie: `werkzaamhedenEigen` staat nog wel op nul, omdat de schil
    daar geen "weet ik niet" voor kent.
14. **De korting op het notarishonorarium is aan of uit, en aan betekent het
    maximum.** De schil geeft een knop, de kern wil een percentage tussen nul en
    twintig. Aan wordt twintig, uit wordt nul. Twintig procent is het wettelijke
    maximum en de notaris is niet verplicht die korting te geven, **dus toont de
    stand "aan" het gunstigste geval en niet het waarschijnlijkste.** Dat staat
    als tekst bij de knop in de schil.
15. **Onaangeroerd en onbekend zijn twee verschillende dingen.** Een leeg
    bedragveld dat de gebruiker heeft laten staan telt als nul en zegt niets;
    alleen een klik op "weet ik niet" markeert de post als onbekend en roept de
    melding op dat de uitkomst onvolledig is. Daarvoor vulde elk onaangeroerd
    veld de lijst met onbekende posten, waardoor de melding verscheen zonder dat
    de gebruiker iets had gedaan.
16. **Elke post en elke melding hoort bij één rol.** Landmeter, diagnostics,
    mainlevee, de melding over onvolledigheid, de melding over ontbrekende
    verkrijgingskosten en alle waarschuwingen zijn verkoperszaken. In de rol
    kopen levert de kern ze niet meer op en toont de schil ze niet. Dat is op
    twee plaatsen vastgelegd, in de kern en in de presentatielaag, en met
    assertions afgedekt: geen enkel verkopersveld beweegt de kosten van de
    koper, en geen enkel kopersveld de opbrengst van de verkoper.
17. **Twee makelaarkanten, met terugval.** De kern kende één makelaaropgave,
    wat in de route beide fout ging omdat het daar twee transacties zijn. Er is
    nu een tweede set voor de aankoopkant. Die volgt de verkoopkant zolang zijn
    velden op `null` staan, zodat de routes koper en verkoper apart functioneel
    ongewijzigd blijven en alle bestaande assertions blijven gelden. De
    aankoopkant bepaalt de grondslag van de notaris, de verkoopkant de
    netto-opbrengst en de meerwaarde. Per kant kan de courtage als percentage of
    als vast bedrag worden opgegeven; die omzetting gebeurt in de kern, niet in
    de interface. De notariskosten rekenen over de koopsom, de meerwaarde over
    de verkoopprijs.
18. **Corsica, Lyon, Alsace.** 2A en 2B hebben dezelfde tarieven gekregen omdat
   de bron één regel voor de Collectivité de Corse heeft; 69 heeft één sleutel
   omdat de twee bronregels identieke tarieven hebben; 67 en 68 hebben elk een
   eigen sleutel onder de Collectivité européenne d'Alsace. Zo aangeleverd door
   de opdrachtgever.

---

## OPENSTAAND

1. **De vorige interface staat er nog als terugvaloptie.** `index.html` is nu
   de nieuwe schil; de oude staat als `index-oud.html` en draait op dezelfde
   rekenkern. Twee interfaces onderhouden kost dubbel: elke wijziging aan de
   kern moet in beide worden nagelopen, en de testset dekt alleen de kern en de
   adapter, niet de DOM van `index-oud.html`. Zet hem weg zodra je de nieuwe
   vertrouwt. Het originele ontwerp staat ongewijzigd in `schil/`.
2. **De hoogtemelding is niet tegen de echte artikelpagina getest.** `DOEL` in
   `schil.js` staat op `https://infofrankrijk.com`, zonder `www`, gelijk aan het
   adres in `ARTIKEL_URL`. Wijkt dat af van waar het artikel werkelijk draait,
   ook alleen in het `www`-deel, dan gooit de browser elk bericht stil weg. In
   tegenstelling tot de oude interface stuurt de nieuwe niet meer naar `'*'`,
   dus dit is nu een harde eis in plaats van een nette gewoonte.
3. **Ik heb vanuit de uitvoeromgeving nog steeds geen primaire bron kunnen
   openen.** De netwerkproxy blokkeert impots.gouv.fr, bofip.impots.gouv.fr,
   legifrance.gouv.fr, economie.gouv.fr en service-public.fr. Wat inmiddels wel
   primair is bevestigd, staat onder GEVERIFIEERD met vermelding dat de
   opdrachtgever die controle heeft gedaan. Van de vier signaleringen is er
   inmiddels één met een bevestigde bron en ingangsdatum (gemeubileerde
   verhuur); voor de andere drie geldt onverminderd dat zij daarom geen bedrag,
   percentage of termijn bevatten.
4. **Is `dmto_2026-06.pdf` de nieuwste uitgave?** Niet vastgesteld; de
   overzichtspagina was niet bereikbaar. Er draait nu wel een wekelijkse
   GitHub Action (`.github/workflows/dmto-controle.yml`) die de
   overzichtspagina afzoekt op een uitgave die nieuwer is dan de peildatum en
   dan een issue aanmaakt. Die Action heeft nog nooit gedraaid en is dus nog
   niet tegen de echte pagina bewezen: het patroon `dmto_JJJJ-MM.pdf` is een
   aanname over de bestandsnamen. Verandert de pagina van opzet, dan faalt de
   Action zichtbaar in plaats van stil — maar dat moet dan wel worden opgepakt.
   Het overnemen van de tarieven blijft in alle gevallen handwerk.
5. **Calvados en Savoie.** In de bron staat bij Calvados een abattement van
   46.000 euro en bij Savoie een verlaagd tarief van 4,00 procent. Uit de platte
   tekst is niet af te leiden op welke kolom die betrekking hebben (art. 1594 F
   ter, F sexies of F septies). Niet ingebouwd. Voor die twee departementen kan
   de tool dus te hoog uitkomen in de gevallen waarop die regelingen zien.
6. **Overige abattements en verlaagde tarieven per departement.** `dmto.json`
   bevat alleen `std` en `primo`. Departementale abattements en sectorale
   verlaagde tarieven uit de DGFiP-tabel zijn niet opgenomen.
7. **De 0,5-punts verhoging is tijdelijk.** De verhoging op grond van wet
   2025-127 loopt volgens de gangbare lezing tot en met een einddatum in 2028.
   De exacte einddatum is niet uit een primaire bron bevestigd en zit niet in
   `dmto.json`. De schil waarschuwt inmiddels wel als de peildatum oud wordt,
   maar dat is een waarschuwing over de ouderdom van het bestand en niet over
   het aflopen van deze verhoging; die einddatum kent de tool niet.
8. **Voorwaarden primo-accédant.** De tool vraagt alleen of de gebruiker
   primo-accédant is. De wettelijke voorwaarden (geen eigenaar van het
   hoofdverblijf in de twee jaar vóór de akte, en bestemming als hoofdverblijf)
   worden niet gecontroleerd of toegelicht buiten de korte tekst bij het
   invoerveld. De bronvermelding hiervoor is niet zelf geverifieerd.
9. **Emolumenten bij VEFA.** De opdracht schrijft hetzelfde barème voor als bij
   bestaande bouw. Of het tarif réglementé voor een VEFA-akte daadwerkelijk
   identiek is, is niet geverifieerd.
10. **Uitzonderingen op de plus-value die de tool niet kent:** vrijstelling bij
   een verkoopprijs tot 15.000 euro, de vrijstelling voor niet-ingezetenen, de
   vrijstelling bij herinvestering in een hoofdverblijf, bezit langer dan
   30 jaar in combinatie met andere vrijstellingen, en de behandeling van
   werkelijke in plaats van forfaitaire verbouwingskosten. Ongewijzigd ten
   opzichte van de bestaande tool.
11. **De hoogte-meldingen zijn niet tegen de echte artikelpagina getest.** De
    tool stuurt `{ type: 'if-tool-hoogte', hoogte }` naar het bovenliggende
    venster. Dat is in een testpagina met een iframe geverifieerd: drie
    meldingen bij het laden, convergerend naar de eindhoogte, en geen nieuwe
    melding als de hoogte niet verandert. De artikelkant regel je zelf, dus of
    het daar samen goed valt, is niet vastgesteld. Let op dat `body` een
    `min-height: 100vh` heeft: de gemelde hoogte is nooit kleiner dan het
    iframe zelf.
12. **De ontvanger van postMessage is niet beperkt.** Het bericht gaat met
    `'*'` naar het bovenliggende venster, omdat de origin van het artikel hier
    niet bekend is. Het bericht bevat alleen een hoogte in pixels en dus geen
    gegevens van de gebruiker, maar strenger is netter: vul de origin in zodra
    die vaststaat.
13. **De tool rondt de plus-value en de sociale lasten niet af op hele euro's,**
    terwijl de belastingdienst dat wel doet. Alleen het DMTO en de surtaxe
    worden afgerond. Dit was al zo en is niet veranderd.

### Posten met status `teverifieren` in `bronnen.json`

Wat in het verantwoordingspaneel als *nog na te gaan* in amber staat, staat
hier. De testset houdt de twee lijsten gelijk: hij valt om zodra een post op
`teverifieren` staat en hier niet wordt genoemd, en ook zodra een post op
`primair` of `geentarief` gaat staan terwijl zijn id hier nog tussen backticks
staat. Wie er één afvinkt, werkt beide bestanden in één beweging bij.

**Op dit moment staat er geen enkele post op `teverifieren`.** De vier die hier
stonden zijn in augustus 2026 alle vier afgehandeld, met wetsartikelen die de
opdrachtgever heeft aangeleverd. De gemeentelijke opslag en de contribution de
sécurité immobilière staan nu op `primair` en zijn verplaatst naar GEVERIFIEERD;
bij die tweede kwam meteen een fout aan het licht, want de ondergrens van 15 euro
per akte ontbrak in de tool. De btw over de emolumenten en de débours staan nu op
`geentarief`: zij hebben geen eigen wettelijke bepaling en krijgen die ook niet,
dus er valt niets na te gaan. Die twee staan onder AANNAMES en in het paneel
neutraal in plaats van in amber.

Dat deze lijst leeg is, betekent niet dat alles klopt. Het betekent dat elke post
die de tool gebruikt óf tegen een wetsartikel is gelegd, óf uitdrukkelijk als
schatting is benoemd. De punten hierboven in deze sectie staan daar los van en
blijven onverminderd open.
