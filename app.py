import streamlit as st
import pandas as pd
from datetime import date

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
    }
    .stButton>button:hover {
        background-color: #600000;
        color: white;
    }
    .metric-value {
        font-size: 1.5rem !important;
        color: #800000 !important;
        font-weight: 600;
    }
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
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# 2. LOGICA: DATABASES & REKENREGELS
# -----------------------------------------------------------------------------

# Voorbeeld database makelaarstarieven per departement (kan uitgebreid worden)
# Key = eerste 2 cijfers van postcode, Value = percentage
DEPARTEMENT_TARIEVEN = {
    "75": 5.0,  # Parijs (vaak lager %)
    "06": 6.0,  # Alpes-Maritimes
    "33": 5.5,  # Gironde
    "58": 7.0,  # Nièvre (vaak hoger in landelijk gebied)
    "24": 6.5,  # Dordogne
    "DEFAULT": 6.0 # Landelijk gemiddelde indien onbekend
}

def get_makelaar_percentage(postcode_input):
    """Haalt percentage op basis van eerste 2 cijfers, anders default."""
    if not postcode_input or len(postcode_input) < 2:
        return DEPARTEMENT_TARIEVEN["DEFAULT"]
    
    dept_code = postcode_input[:2]
    return DEPARTEMENT_TARIEVEN.get(dept_code, DEPARTEMENT_TARIEVEN["DEFAULT"])

def bereken_abattement(jaren_bezit):
    """
    Berekent de korting (abattement) op de plus-value belasting 
    op basis van jaren bezit voor IR (Inkomsten) en PS (Sociale lasten).
    Bron: Franse belastingdienst regels vastgoed.
    """
    if jaren_bezit < 6:
        return 0.0, 0.0

    # 1. Impôt sur le Revenu (IR)
    # 6-21 jaar: 6% per jaar
    # 22e jaar: 4%
    # Totaal vrijgesteld na 22 jaar
    if jaren_bezit >= 22:
        abat_ir = 100.0
    else:
        abat_ir = (jaren_bezit - 5) * 6.0

    # 2. Prélèvements Sociaux (PS)
    # 6-21 jaar: 1.65% per jaar
    # 22e jaar: 1.60%
    # 23-30 jaar: 9% per jaar
    # Totaal vrijgesteld na 30 jaar
    if jaren_bezit >= 30:
        abat_ps = 100.0
    elif jaren_bezit >= 23:
        # Eerst 22 jaar berekenen
        basis_22 = (16 * 1.65) + 1.60 # = 28%
        # Dan jaren boven 22
        extra_jaren = jaren_bezit - 22
        abat_ps = basis_22 + (extra_jaren * 9.0)
    else:
        # Tussen 6 en 22
        abat_ps = (jaren_bezit - 5) * 1.65
        if jaren_bezit == 22: 
             abat_ps += 1.60 # correctie voor 22e jaar indien exact

    return min(abat_ir, 100.0), min(abat_ps, 100.0)

def bereken_notariskosten(prijs_voor_notaris, dmto_tarief=5.81):
    """Berekent notariskosten over de grondslag."""
    # Émoluments staffel
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

# Reset functie (Fixed logic)
if st.sidebar.button("🔄 RESET SCENARIO"):
    st.session_state.clear()
    st.rerun()

st.sidebar.title("Instellingen")

# A. Locatie & Makelaar
st.sidebar.subheader("1. Locatie & Makelaar")
postcode = st.sidebar.text_input("Postcode (voor makelaarstarief)", value="58000", max_chars=5)
# Tarief ophalen
standaard_tarief = get_makelaar_percentage(postcode)

makelaar_optie = st.sidebar.radio("Wie betaalt de makelaar?", 
                                  ["Verkoper (Charge Vendeur)", "Koper (Charge Acquéreur)", "Geen makelaar"],
                                  index=0)

if makelaar_optie == "Geen makelaar":
    makelaar_perc = 0.0
else:
    makelaar_perc = st.sidebar.number_input(f"Makelaarscourtage (%) - Regio {postcode[:2]}", value=standaard_tarief, step=0.1, format="%.2f")

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

# C. Kosten & Plus-value instellingen
st.sidebar.subheader("3. Kosten & Belastingen")
landmeter = st.sidebar.number_input("Landmeter / Diagnostics €", value=1500.0, step=100.0)

# De Ruyter
de_ruyter = st.sidebar.checkbox("Toepassing Arrest de Ruyter", value=True, help="Verlaagt sociale lasten naar 7,5% indien verkoper in NL sociaal verzekerd is.")

# Plus Value toggle
pv_methode = st.sidebar.radio("Plus-value berekening", ["Automatisch (obv jaren)", "Handmatige invoer"], index=0)

plus_value_tax = 0.0
pv_toelichting = ""
bruto_winst_voor_pv = 0.0

# -----------------------------------------------------------------------------
# 4. HOOFDBEREKENINGEN
# -----------------------------------------------------------------------------

# 1. Makelaarscourtage bedrag
if makelaar_optie == "Geen makelaar":
    makelaarskosten = 0.0
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input
elif makelaar_optie == "Koper (Charge Acquéreur)":
    # Verkoopprijs input is inclusief. Dus: Prijs = Netto + (Netto * Perc)? Nee, meestal is courtage % van totaal of vast.
    # We gaan er vanuit dat de input de TOTAALprijs is die in de advertentie staat.
    # Bij charge acquéreur: Notaris rekent over (Totaal - Courtage).
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input - makelaarskosten
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten # Verkoper krijgt dit op rekening (makelaar pakt zijn deel)
else: # Charge Vendeur
    # Notaris rekent over TOTAAL. Verkoper betaalt makelaar uit zijn opbrengst.
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten

# 2. Notariskosten (Koper)
notariskosten = bereken_notariskosten(prijs_voor_notaris)

# 3. Plus Value Berekening
if pv_methode == "Handmatige invoer":
    plus_value_tax = st.sidebar.number_input("Bedrag Plus-value belasting €", value=39000.0)
    pv_toelichting = "Handmatige invoer"
else:
    # A. Correctie Aankoopsom (Forfaits)
    # Notariskosten forfait: 7.5% van aankoopsom (of werkelijk indien hoger, hier forfait)
    forfait_aankoop = aankoopprijs * 0.075
    # Verbouwingsforfait: 15% van aankoopsom (indien > 5 jaar bezit)
    forfait_verbouwing = aankoopprijs * 0.15 if jaren_bezit > 5 else 0.0
    
    gecorrigeerde_aankoopsom = aankoopprijs + forfait_aankoop + forfait_verbouwing
    
    # B. Bruto Meerwaarde
    # Verkoopprijs min makelaarskosten (die zijn aftrekbaar voor verkoper of al eruit bij charge acquereur)
    # Basis = Netto verkoper basis
    basis_meerwaarde = netto_verkoper_basis
    
    bruto_meerwaarde = basis_meerwaarde - gecorrigeerde_aankoopsom
    
    if bruto_meerwaarde <= 0:
        plus_value_tax = 0.0
        pv_toelichting = "Geen winst na forfaits"
    else:
        # C. Abattements (Aftrek jaren)
        abat_ir_perc, abat_ps_perc = bereken_abattement(jaren_bezit)
        
        belastbaar_ir = bruto_meerwaarde * (1.0 - (abat_ir_perc / 100.0))
        belastbaar_ps = bruto_meerwaarde * (1.0 - (abat_ps_perc / 100.0))
        
        # D. Tarieven
        tarief_ir = 19.0 # Standaard EU resident
        tarief_ps = 7.5 if de_ruyter else 17.2
        
        tax_ir = belastbaar_ir * (tarief_ir / 100.0)
        tax_ps = belastbaar_ps * (tarief_ps / 100.0)
        
        plus_value_tax = tax_ir + tax_ps
        
        # Format string voor toelichting
        pv_toelichting = f"Winst na forfaits: € {bruto_meerwaarde:,.0f}\n"
        pv_toelichting += f"Aftrek bezit: {abat_ir_perc:.1f}% (IR) / {abat_ps_perc:.1f}% (Soc)"

# 4. Totalen
totaal_kosten_verkoper = makelaarskosten + plus_value_tax + landmeter
if makelaar_optie == "Koper (Charge Acquéreur)":
    # Bij deze optie betaalt de koper de makelaar direct of via notaris, maar het gaat wel 'af' van de bruto verkoopprijs die binnenkomt
    # Voor het overzicht 'Kosten Verkoper' is het technisch gezien geen kost, maar een lagere opbrengst.
    # Echter, voor de "frictiekosten" tellen we hem wel.
    # Om verwarring te voorkomen in het schema: 
    # Bruto prijs = wat koper betaalt. 
    pass

netto_opbrengst = verkoopprijs_input - totaal_kosten_verkoper
werkelijke_winst = netto_opbrengst - aankoopprijs
frictiekosten = notariskosten + totaal_kosten_verkoper

# -----------------------------------------------------------------------------
# 5. UI OUTPUT
# -----------------------------------------------------------------------------

st.title("Vastgoedtransactieanalyse")
st.markdown("Een interactieve financiële uiteenzetting voor vastgoedtransacties in Frankrijk.")

st.markdown("---")

col1, col2 = st.columns([1.4, 1])

with col1:
    st.subheader("Financiële Specificatie")
    
    # Tabel opbouwen
    df_data = []
    
    # KOPER
    df_data.append(["**1. Kosten Koper**", "", ""])
    df_data.append(["Notariskosten", f"Over € {prijs_voor_notaris:,.0f} (Grondslag)", f"€ {notariskosten:,.2f}"])
    
    df_data.append(["", "", ""])
    
    # VERKOPER
    df_data.append(["**2. Kosten Verkoper / Afhoudingen**", "", ""])
    
    # Makelaar weergave
    makelaar_tekst = f"{makelaar_perc}% ({makelaar_optie})"
    df_data.append(["Makelaarscourtage", makelaar_tekst, f"€ {makelaarskosten:,.2f}"])
    
    # Plus value
    if pv_methode == "Handmatige invoer":
        pv_spec = "Handmatige invoer"
    else:
        pv_spec = f"Jaren bezit: {jaren_bezit} jaar\n(De Ruyter: {'Ja' if de_ruyter else 'Nee'})"
    
    df_data.append(["Plus-value belasting", pv_spec, f"€ {plus_value_tax:,.2f}"])
    df_data.append(["Landmeter / Diagnostics", "", f"€ {landmeter:,.2f}"])
    
    df_data.append(["**Totaal afhoudingen**", "", f"**€ {totaal_kosten_verkoper:,.2f}**"])

    df = pd.DataFrame(df_data, columns=["Onderdeel", "Specificatie", "Bedrag"])
    st.table(df)
    
    if pv_methode == "Automatisch (obv jaren)":
        with st.expander("ℹ️ Detailberekening Plus-Value"):
            st.write(f"**Verkoopjaar:** {jaar_verkoop} | **Jaren bezit:** {jaren_bezit}")
            st.write(f"**Bruto meerwaarde:** € {bruto_meerwaarde:,.2f}")
            st.write(f"- Aftrek IR ({abat_ir_perc}%): € {bruto_meerwaarde * (abat_ir_perc/100):,.2f}")
            st.write(f"- Aftrek Soc ({abat_ps_perc}%): € {bruto_meerwaarde * (abat_ps_perc/100):,.2f}")
            st.write("---")
            st.write(f"**Te betalen IR (19%):** € {tax_ir:,.2f}")
            st.write(f"**Te betalen Soc ({tarief_ps}%):** € {tax_ps:,.2f}")

with col2:
    st.subheader("Resultaat")
    
    st.markdown(f"""
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border-left: 5px solid #800000;">
        <h4 style="margin-top:0;">Netto Opbrengst</h4>
        <p style="font-size: 0.9rem; margin-bottom: 5px;">(Op bankrekening verkoper)</p>
        <p class="metric-value">€ {netto_opbrengst:,.2f}</p>
        <hr>
        <h4 style="margin-top:0;">Werkelijke Winst</h4>
        <p style="font-size: 0.9rem; margin-bottom: 5px;">(Netto - Oorspronkelijke aankoop)</p>
        <p class="metric-value" style="color: #2e7d32 !important;">€ {werkelijke_winst:,.2f}</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("### Frictiekosten")
    st.markdown(f"**€ {frictiekosten:,.2f}**")
    st.info("Som van notariskosten, makelaarscourtage en belastingen die 'verdwijnen' in de transactieketen.")

# Footer
st.markdown(
    """
    <div class="footer">
    Deze interactieve analyse wordt u aangeboden door <b>Infofrankrijk.com</b>
    </div>
    """, unsafe_allow_html=True
)
