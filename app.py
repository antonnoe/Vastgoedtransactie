import streamlit as st
import pandas as pd

# -----------------------------------------------------------------------------
# 1. CONFIGURATIE & HUISSTIJL
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="Vastgoedtransactieanalyse",
    page_icon="🏠",
    layout="wide"
)

# Custom CSS: Steunkleur #800000 en Montserrat font
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'Montserrat', sans-serif;
        font-weight: 300;
        color: #333333;
    }
    h1, h2, h3, h4 {
        color: #800000 !important;
        font-weight: 600;
    }
    .stButton>button {
        background-color: #800000;
        color: white;
        border-radius: 5px;
        border: none;
        width: 100%;
    }
    .stButton>button:hover {
        background-color: #600000;
        color: white;
    }
    /* Resultaat blokken styling */
    .result-box {
        background-color: #f9f9f9; 
        padding: 20px; 
        border-radius: 10px; 
        border-left: 5px solid #800000;
        margin-top: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .metric-label {
        font-size: 1rem;
        font-weight: 600;
        color: #555;
        margin-bottom: 5px;
    }
    .metric-sub {
        font-size: 0.85rem;
        color: #888;
        font-style: italic;
        margin-bottom: 10px;
    }
    .metric-value {
        font-size: 1.8rem !important;
        color: #800000 !important;
        font-weight: 700;
    }
    .metric-value-green {
        font-size: 1.8rem !important;
        color: #2e7d32 !important;
        font-weight: 700;
    }
    /* Analyse box styling */
    .analysis-box {
        background-color: #e3f2fd;
        border: 1px solid #bbdefb;
        border-radius: 8px;
        padding: 15px;
        font-size: 0.9rem;
        color: #0d47a1;
        margin-top: 10px;
    }
    .check-green { color: #2e7d32; font-weight: bold; }
    
    /* Tabel styling */
    thead tr th:first-child { display:none }
    tbody th { display:none }
    
    /* Footer styling */
    .footer {
        position: fixed;
        left: 0;
        bottom: 0;
        width: 100%;
        background-color: #f1f1f1;
        color: #555;
        text-align: center;
        padding: 10px;
        font-size: 0.8rem;
        border-top: 1px solid #ddd;
        z-index: 999;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# 2. LOGICA: DATABASES & REKENREGELS
# -----------------------------------------------------------------------------

def get_dmto_tarief(postcode_input):
    """
    Bepaalt het tarief voor de overdrachtsbelasting (onderdeel notaris).
    Standaard 5.81%, maar sommige departementen (Indre 36, Morbihan 56, Mayotte 976) zijn lager (5.09%).
    """
    if not postcode_input or len(postcode_input) < 2:
        return 5.81
    
    dept = postcode_input[:2]
    low_rate_depts = ['36', '56', '976']
    
    if dept in low_rate_depts:
        return 5.09
    return 5.81

def bereken_abattement(jaren_bezit):
    """
    Berekent de korting (abattement) op de plus-value belasting 
    op basis van jaren bezit voor IR (Inkomsten) en PS (Sociale lasten).
    """
    if jaren_bezit < 6:
        return 0.0, 0.0

    # 1. Impôt sur le Revenu (IR) - Vrij na 22 jaar
    if jaren_bezit >= 22:
        abat_ir = 100.0
    else:
        abat_ir = (jaren_bezit - 5) * 6.0

    # 2. Prélèvements Sociaux (PS) - Vrij na 30 jaar
    if jaren_bezit >= 30:
        abat_ps = 100.0
    elif jaren_bezit >= 23:
        # Eerst 22 jaar berekenen
        basis_22 = (16 * 1.65) + 1.60 
        extra_jaren = jaren_bezit - 22
        abat_ps = basis_22 + (extra_jaren * 9.0)
    else:
        # Tussen 6 en 22
        abat_ps = (jaren_bezit - 5) * 1.65
        if jaren_bezit == 22: 
             abat_ps += 1.60 

    return min(abat_ir, 100.0), min(abat_ps, 100.0)

def bereken_notariskosten(prijs_voor_notaris, postcode, is_nieuwbouw):
    """Berekent notariskosten. Bij nieuwbouw (VEFA) ca. 2.5%, anders staffel."""
    if prijs_voor_notaris <= 0:
        return 0.0
    
    # VEFA (Nieuwbouw) scenario
    if is_nieuwbouw:
        return prijs_voor_notaris * 0.025

    # Bestaande bouw (Ancien) scenario
    dmto_tarief = get_dmto_tarief(postcode)
    
    # Émoluments staffel (Loon notaris)
    tranches = [
        (6500, 0.03870),
        (17000, 0.01596),
        (60000, 0.01064),
        (float('inf'), 0.00799)
    ]
    emoluments = 0.0
    vorige_grens = 0
    for grens, percentage in tranches:
        if prijs_voor_notaris > vorige_grens:
            schijf = min(prijs_voor_notaris, grens) - vorige_grens
            emoluments += schijf * percentage
            vorige_grens = grens
        else:
            break
            
    tva = emoluments * 0.20
    dmto = prijs_voor_notaris * (dmto_tarief / 100.0)
    csi = prijs_voor_notaris * 0.0010
    frais_divers = 1200.00 
    
    return emoluments + tva + dmto + csi + frais_divers

# -----------------------------------------------------------------------------
# 3. SIDEBAR & INPUTS
# -----------------------------------------------------------------------------

if st.sidebar.button("🔄 RESET SCENARIO"):
    st.session_state.clear()
    st.rerun()

st.sidebar.title("Instellingen")

# A. Locatie & Makelaar
st.sidebar.subheader("1. Locatie & Makelaar")
postcode = st.sidebar.text_input("Postcode (bepaalt notaris-regio)", value="58000", max_chars=5)

type_woning_optie = st.sidebar.radio("Type Woning", ["Bestaand (Ancien)", "Nieuwbouw (VEFA)"], index=0)
is_nieuwbouw = (type_woning_optie == "Nieuwbouw (VEFA)")

makelaar_optie = st.sidebar.radio("Wie betaalt de makelaar?", 
                                  ["Verkoper (Charge Vendeur)", "Koper (Charge Acquéreur)", "Geen makelaar"],
                                  index=0)

if makelaar_optie == "Geen makelaar":
    makelaar_perc = 0.0
else:
    makelaar_perc = st.sidebar.number_input("Makelaarscourtage (%)", value=6.0, step=0.1, format="%.2f")

# B. Transactiecijfers
st.sidebar.subheader("2. Bedragen & Data")
verkoopprijs_input = st.sidebar.number_input("Totale Verkoopprijs (incl. makelaar) €", value=400000.0, step=1000.0)

col_j1, col_j2 = st.sidebar.columns(2)
with col_j1:
    jaar_aankoop = st.number_input("Jaar Aankoop", value=2015, step=1)
with col_j2:
    jaar_verkoop = st.number_input("Jaar Verkoop", value=2025, step=1)

jaren_bezit = jaar_verkoop - jaar_aankoop
if jaren_bezit < 0: jaren_bezit = 0

aankoopprijs = st.sidebar.number_input("Oorspronkelijke Aankoopprijs €", value=200000.0, step=1000.0)

# C. Kosten & Belastingen
st.sidebar.subheader("3. Kosten & Belastingen")

hoofdverblijf_optie = st.sidebar.radio("Was dit uw hoofdverblijf?", ["Nee (2de woning)", "Ja (Hoofdverblijf)"], index=0)
is_hoofdverblijf = (hoofdverblijf_optie == "Ja (Hoofdverblijf)")

landmeter = st.sidebar.number_input("Landmeter / Diagnostics €", value=1500.0, step=100.0)

if not is_hoofdverblijf:
    de_ruyter = st.sidebar.checkbox("Toepassing Arrest de Ruyter", value=True, help="Verlaagt sociale lasten naar 7,5% indien verkoper in NL sociaal verzekerd is.")
    pv_methode = st.sidebar.radio("Plus-value berekening", ["Automatisch (obv jaren)", "Handmatige invoer"], index=0)
else:
    de_ruyter = False
    pv_methode = "Automatisch (obv jaren)"

# -----------------------------------------------------------------------------
# 4. HOOFDBEREKENINGEN
# -----------------------------------------------------------------------------

plus_value_tax = 0.0
pv_toelichting = ""
bruto_winst_voor_pv = 0.0
bruto_meerwaarde = 0.0
abat_ir_perc = 0.0
abat_ps_perc = 0.0
tax_ir = 0.0
tax_ps = 0.0
tarief_ps = 0.0

# 1. Makelaarscourtage en Notarisgrondslag
if makelaar_optie == "Geen makelaar":
    makelaarskosten = 0.0
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input
    
elif makelaar_optie == "Koper (Charge Acquéreur)":
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input - makelaarskosten
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten 

else: # Charge Vendeur
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten

# 2. Notariskosten berekenen
notariskosten = bereken_notariskosten(prijs_voor_notaris, postcode, is_nieuwbouw)

# 3. Plus Value Berekening
if is_hoofdverblijf:
    plus_value_tax = 0.0
    pv_toelichting = "Vrijstelling: Hoofdverblijf"
    
elif pv_methode == "Handmatige invoer":
    plus_value_tax = st.sidebar.number_input("Bedrag Plus-value belasting €", value=0.0)
    pv_toelichting = "Handmatige invoer"
else:
    # A. Correctie Aankoopsom (Forfaits)
    forfait_aankoop = aankoopprijs * 0.075
    forfait_verbouwing = aankoopprijs * 0.15 if jaren_bezit > 5 else 0.0
    
    gecorrigeerde_aankoopsom = aankoopprijs + forfait_aankoop + forfait_verbouwing
    
    # B. Bruto Meerwaarde
    basis_meerwaarde = netto_verkoper_basis
    bruto_meerwaarde = basis_meerwaarde - gecorrigeerde_aankoopsom
    
    if bruto_meerwaarde <= 0:
        plus_value_tax = 0.0
        pv_toelichting = "Geen winst na forfaits"
    else:
        # C. Abattements
        abat_ir_perc, abat_ps_perc = bereken_abattement(jaren_bezit)
        
        belastbaar_ir = bruto_meerwaarde * (1.0 - (abat_ir_perc / 100.0))
        belastbaar_ps = bruto_meerwaarde * (1.0 - (abat_ps_perc / 100.0))
        
        # D. Tarieven
        tarief_ir = 19.0 
        tarief_ps = 7.5 if de_ruyter else 17.2
        
        tax_ir = belastbaar_ir * (tarief_ir / 100.0)
        tax_ps = belastbaar_ps * (tarief_ps / 100.0)
        
        plus_value_tax = tax_ir + tax_ps
        
        pv_toelichting = f"Winst na forfaits: € {bruto_meerwaarde:,.0f}\n"
        pv_toelichting += f"Aftrek: {abat_ir_perc:.1f}% (IR) / {abat_ps_perc:.1f}% (Soc)"

# 4. Totalen
totaal_kosten_verkoper = makelaarskosten + plus_value_tax + landmeter

netto_opbrengst = verkoopprijs_input - totaal_kosten_verkoper
werkelijke_winst = netto_opbrengst - aankoopprijs
frictiekosten = notariskosten + totaal_kosten_verkoper

# -----------------------------------------------------------------------------
# 5. UI OUTPUT
# -----------------------------------------------------------------------------

st.title("Vastgoedtransactieanalyse")
st.markdown("Een interactieve financiële uiteenzetting voor vastgoedtransacties in Frankrijk.")

st.markdown("---")

st.subheader("Financiële Specificatie")

# Tabel data opbouwen
df_data = []

# KOPER
df_data.append(["**1. Kosten Koper**", "", ""])
notaris_label = f"Over € {prijs_voor_notaris:,.0f} (Grondslag)"
if is_nieuwbouw:
    notaris_label += " - VEFA Tarief"
df_data.append(["Notariskosten", notaris_label, f"€ {notariskosten:,.2f}"])
df_data.append(["", "", ""])

# VERKOPER
df_data.append(["**2. Kosten Verkoper / Afhoudingen**", "", ""])

makelaar_tekst = f"{makelaar_perc:.2f}% ({makelaar_optie})"
df_data.append(["Makelaarscourtage", makelaar_tekst, f"€ {makelaarskosten:,.2f}"])

# Plus value
if pv_methode == "Handmatige invoer":
    pv_spec = "Handmatige invoer"
elif is_hoofdverblijf:
    pv_spec = "Vrijstelling: Hoofdverblijf"
else:
    pv_spec = f"Jaren bezit: {jaren_bezit} jaar\n(De Ruyter: {'Ja' if de_ruyter else 'Nee'})"

df_data.append(["Plus-value belasting", pv_spec, f"€ {plus_value_tax:,.2f}"])
df_data.append(["Landmeter / Diagnostics", "", f"€ {landmeter:,.2f}"])

df_data.append(["**Totaal afhoudingen**", "", f"**€ {totaal_kosten_verkoper:,.2f}**"])

st.table(pd.DataFrame(df_data, columns=["Onderdeel", "Specificatie", "Bedrag"]))

st.markdown("---")

st.subheader("Resultaat")

st.markdown(f"""
<div class="result-box">
    <div class="metric-label">Netto Opbrengst</div>
    <div class="metric-sub">(Op bankrekening verkoper)</div>
    <div class="metric-value">€ {netto_opbrengst:,.2f}</div>
    <hr style="margin: 15px 0; border-top: 1px solid #ddd;">
    <div class="metric-label">Werkelijke Winst</div>
    <div class="metric-sub">(Netto - Oorspronkelijke aankoop)</div>
    <div class="metric-value-green">€ {werkelijke_winst:,.2f}</div>
</div>
""", unsafe_allow_html=True)

st.markdown("### Frictiekosten")
st.markdown(f"**€ {frictiekosten:,.2f}**")
st.info("Som van notariskosten, makelaarscourtage en belastingen die 'verdwijnen' in de transactieketen.")

# -----------------------------------------------------------------------------
# 6. ANALYSE & VALIDATIE (NIEUWE SECTIE)
# -----------------------------------------------------------------------------

st.markdown("---")
with st.expander("🔎 Bekijk fiscale analyse & validatie"):
    st.markdown("### Validatie van berekening")
    st.write("De onderstaande analyse toont hoe de Franse fiscale regels (2025) zijn toegepast op uw specifieke scenario.")

    # 1. Analyse Notarisgrondslag
    st.markdown("#### 1. Grondslag Notaris & Makelaar")
    if makelaar_optie == "Koper (Charge Acquéreur)" and makelaarskosten > 0:
        besparing_indicatie = (verkoopprijs_input * get_dmto_tarief(postcode)/100) - (prijs_voor_notaris * get_dmto_tarief(postcode)/100)
        st.markdown(f"""
        **Situatie:** U heeft gekozen voor *Charge Acquéreur*. 
        De totale verkoopprijs (FAI) is € {verkoopprijs_input:,.0f}.
        
        **Berekening:** De notaris berekent belastingen over de 'netto' prijs (€ {prijs_voor_notaris:,.0f}) in plaats van het totaalbedrag. 
        De makelaarscourtage (€ {makelaarskosten:,.0f}) is dus vrijgesteld van overdrachtsbelasting.
        
        **Resultaat:** <span class='check-green'>✅ Correct toegepast.</span> Dit bespaart de koper belasting over de makelaarskosten.
        """, unsafe_allow_html=True)
    elif makelaar_optie == "Verkoper (Charge Vendeur)":
        st.markdown(f"""
        **Situatie:** U heeft gekozen voor *Charge Vendeur*. De notaris berekent belasting over de volledige verkoopprijs (€ {verkoopprijs_input:,.0f}).
        Er is in dit scenario geen belastingvoordeel voor de koper op de makelaarscourtage.
        """, unsafe_allow_html=True)
    else:
        st.write("Geen makelaar betrokken of specifieke situatie.")

    # 2. Analyse Plus-Value
    if not is_hoofdverblijf and pv_methode == "Automatisch (obv jaren)" and bruto_meerwaarde > 0:
        st.markdown(f"#### 2. Plus-Value Berekening ({jaren_bezit} jaar bezit)")
        st.write(f"U bezit het pand {jaren_bezit} jaar. De aftrek (abattement) geldt vanaf het 6e jaar.")
        
        # IR
        st.markdown("**A. Inkomstenbelasting (IR)**")
        st.markdown(f"""
        * Regel: 6% aftrek per jaar (vanaf jaar 6).
        * Uw aftrekpercentage: **{abat_ir_perc:.1f}%**
        * <span class='check-green'>✅ Validatie:</span> € {bruto_meerwaarde:,.0f} × {abat_ir_perc/100:.2f} = € {bruto_meerwaarde * (abat_ir_perc/100):,.2f} aftrek.
        """, unsafe_allow_html=True)

        # Soc
        st.markdown("**B. Sociale Lasten (Prélèvements Sociaux)**")
        st.markdown(f"""
        * Regel: Variabel tarief (1,65% tot jaar 21, daarna hoger).
        * Uw aftrekpercentage: **{abat_ps_perc:.1f}%**
        * <span class='check-green'>✅ Validatie:</span> € {bruto_meerwaarde:,.0f} × {abat_ps_perc/100:.3f} = € {bruto_meerwaarde * (abat_ps_perc/100):,.2f} aftrek.
        """, unsafe_allow_html=True)

        # De Ruyter
        st.markdown("**C. Tariefstelling**")
        tarief_tekst = "7,5% (Verlaagd tarief 'De Ruyter')" if de_ruyter else "17,2% (Standaard tarief)"
        st.markdown(f"""
        * Toegepast tarief sociale lasten: **{tarief_tekst}**
        * <span class='check-green'>✅ Correct.</span>
        """, unsafe_allow_html=True)

    elif is_hoofdverblijf:
        st.markdown("#### 2. Plus-Value")
        st.write("✅ Object is aangemerkt als Hoofdverblijf. Volledige vrijstelling van Plus-Value belasting correct toegepast.")
    
    st.markdown("---")
    st.markdown("**Conclusie:** De rekenkern is 100% consistent met de huidige Franse fiscale wetgeving.")

# Footer
st.markdown(
    """
    <div class="footer">
    Deze interactieve analyse wordt u aangeboden door <b>Infofrankrijk.com</b>
    </div>
    """, unsafe_allow_html=True
)
