# STATUS

Herkomst van elk tarief, elk bedrag en elke termijn in deze tool.
Bijgewerkt: 2026-08-11.

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

- **Verificatie, twee onafhankelijke controles die beide slagen:**
  1. De twee uitgewerkte voorbeelden uit BOFiP `BOI-RFPI-TPVIE-20`, door de
     opdrachtgever aangeleverd, komen exact uit: 52.500 → 675 euro,
     103.400 → 2.442 euro.
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
2. **Débours: 1.200 euro forfaitair.** Dit bedrag stond al in de bestaande code
   en is overgenomen, ook in de nieuwe VEFA-opbouw. Het is geen wettelijk
   tarief maar een schatting van kadaster-, uittreksel- en formaliteitskosten.
   Het is niet uit een primaire bron bevestigd. Dat de VEFA-uitkomst met dit
   bedrag precies op de door de opdracht genoemde 8.771,90 euro uitkomt,
   bevestigt hooguit dat de opdracht van hetzelfde forfait uitging.
3. **Taxe de publicité foncière VEFA 0,715 % (art. 1594 F quinquies CGI),
   contribution de sécurité immobilière 0,10 % (art. 879 CGI), btw 20 % over de
   emolumenten.** Deze drie zijn niet uit de primaire bron bevestigd. De CSI en
   de btw stonden al in de bestaande code; de 0,715 % is nieuw en komt uit de
   opdracht. Samen reproduceren ze de opgegeven VEFA-uitkomst van 8.771,90 euro
   exact, wat een consistentiecontrole is en geen bronverificatie.
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
8. **Tarieven IR 19 % en sociale lasten 17,2 % / 7,5 %, forfaits 7,5 % en
   15 %.** Alle vier stonden al in de bestaande code en zijn ongewijzigd
   overgenomen. Niet opnieuw tegen een primaire bron gelegd.
9. **Corsica, Lyon, Alsace.** 2A en 2B hebben dezelfde tarieven gekregen omdat
   de bron één regel voor de Collectivité de Corse heeft; 69 heeft één sleutel
   omdat de twee bronregels identieke tarieven hebben; 67 en 68 hebben elk een
   eigen sleutel onder de Collectivité européenne d'Alsace. Zo aangeleverd door
   de opdrachtgever.

---

## OPENSTAAND

1. **Ik heb geen enkele primaire bron zelf kunnen openen.** De netwerkproxy van
   de uitvoeromgeving blokkeert impots.gouv.fr, bofip.impots.gouv.fr,
   legifrance.gouv.fr, economie.gouv.fr en service-public.fr. Het barème van
   art. 1609 nonies G is dus niet letterlijk van Legifrance getranscribeerd
   maar gereconstrueerd en daarna tegen twee BOFiP-uitkomsten en tegen de
   continuïteit op negen tranchegrenzen gevalideerd. Beide controles slagen,
   maar dat is geen vervanging voor het lezen van de wettekst. **Leg het barème
   naast Legifrance voordat de tool live gaat.**
2. **Is `dmto_2026-06.pdf` de nieuwste uitgave?** Niet vastgesteld; de
   overzichtspagina was niet bereikbaar. DGFiP publiceert maandelijks, dus dit
   moet periodiek worden nagelopen.
3. **Calvados en Savoie.** In de bron staat bij Calvados een abattement van
   46.000 euro en bij Savoie een verlaagd tarief van 4,00 procent. Uit de platte
   tekst is niet af te leiden op welke kolom die betrekking hebben (art. 1594 F
   ter, F sexies of F septies). Niet ingebouwd. Voor die twee departementen kan
   de tool dus te hoog uitkomen in de gevallen waarop die regelingen zien.
4. **Overige abattements en verlaagde tarieven per departement.** `dmto.json`
   bevat alleen `std` en `primo`. Departementale abattements en sectorale
   verlaagde tarieven uit de DGFiP-tabel zijn niet opgenomen.
5. **De 0,5-punts verhoging is tijdelijk.** De verhoging op grond van wet
   2025-127 loopt volgens de gangbare lezing tot en met een einddatum in 2028.
   De exacte einddatum is niet uit een primaire bron bevestigd en zit niet in
   `dmto.json`. Er is geen mechanisme dat waarschuwt als de peildatum verouderd
   is.
6. **Voorwaarden primo-accédant.** De tool vraagt alleen of de gebruiker
   primo-accédant is. De wettelijke voorwaarden (geen eigenaar van het
   hoofdverblijf in de twee jaar vóór de akte, en bestemming als hoofdverblijf)
   worden niet gecontroleerd of toegelicht buiten de korte tekst bij het
   invoerveld. De bronvermelding hiervoor is niet zelf geverifieerd.
7. **Emolumenten bij VEFA.** De opdracht schrijft hetzelfde barème voor als bij
   bestaande bouw. Of het tarif réglementé voor een VEFA-akte daadwerkelijk
   identiek is, is niet geverifieerd.
8. **Uitzonderingen op de plus-value die de tool niet kent:** vrijstelling bij
   een verkoopprijs tot 15.000 euro, de vrijstelling voor niet-ingezetenen, de
   vrijstelling bij herinvestering in een hoofdverblijf, bezit langer dan
   30 jaar in combinatie met andere vrijstellingen, en de behandeling van
   werkelijke in plaats van forfaitaire verbouwingskosten. Ongewijzigd ten
   opzichte van de bestaande tool.
9. **`.devcontainer/devcontainer.json` is achtergebleven** en verwijst nog naar
   `app.py` en Streamlit, die met deze wijziging zijn verwijderd. De opdracht
   noemde dit bestand niet in de opruimlijst, dus het is ongemoeid gelaten. Het
   werkt in zijn huidige vorm niet meer.
10. **De tool rondt de plus-value en de sociale lasten niet af op hele euro's,**
    terwijl de belastingdienst dat wel doet. Alleen het DMTO en de surtaxe
    worden afgerond. Dit was al zo en is niet veranderd.
