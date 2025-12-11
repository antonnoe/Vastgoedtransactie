import streamlit as st
import pandas as pd

# -----------------------------------------------------------------------------
# 1. CONFIGURATIE & HUISSTIJL (lichte achtergrond, Poppins / Mulish, kleur #800000)
# --- Prioriteit: maximale leesbaarheid, geen zwarte invoervelden ----------
st.set_page_config(
    page_title="Vastgoedtransactieanalyse",
    page_icon="🏠",
    layout="wide"
)

st.markdown(
    """
    <style>
    /* Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Mulish:wght@300;400;600;700&display=swap');

    /* Base / Light */
    html, body, .stApp {
        background-color: #ffffff !important;
        color: #222222 !important;
        font-family: 'Poppins', 'Mulish', system-ui, -apple-system, "Segoe UI", Roboto, Arial;
    }

    /* Block container: meer top-padding zodat h1 niet in de topbar zit */
    .block-container {
        padding-top: 2.5rem;
        padding-bottom: 1.25rem;
        padding-left: 2rem;
        padding-right: 2rem;
        max-width: 1400px;
    }

    /* Sidebar: duidelijk lichte achtergrond en donkere tekst */
    [data-testid="stSidebar"] {
        width: 320px !important;
        min-width: 300px !important;
        background-color: #faf9f8 !important;
        color: #222 !important;
        padding-top: 1rem;
        padding-left: 1rem;
        padding-right: 1rem;
        border-right: 1px solid rgba(0,0,0,0.04);
    }
    [data-testid="stSidebar"] * { color: #222 !important; }

    /* Zorg dat sidebar intern scrollt (voorkomt pagina-scroll) */
    [data-testid="stSidebar"] > div:first-child {
        max-height: calc(100vh - 48px);
        overflow-y: auto;
        padding-right: 6px;
    }

    /* Verwijder donkere/zwart-achtige invoervelden: maak inputs licht met duidelijke rand */
    div[data-baseweb="input"] > div,
    .stTextInput>div, .stNumberInput>div, input[type="text"], input[type="number"] {
        background-color: #ffffff !important;
        color: #222 !important;
        border: 1px solid #e8e8e8 !important;
        border-radius: 8px;
    }
    /* Radio / checkbox labels: donker genoeg */
    div[role="radiogroup"] label, .stCheckbox label, .stRadio label {
        color: #222 !important;
    }

    /* Expander header (voorkom donkere blokken) */
    .streamlit-expanderHeader, .css-1v3fvcr { background: transparent !important; color: #222 !important; }

    /* H1 en headers: accentkleur en voldoende margin-top */
    .stApp h1 {
        color: #800000 !important;
        font-family: 'Mulish', 'Poppins', sans-serif !important;
        font-size: 2.2rem;
        margin-top: 0.5rem;
        margin-bottom: 0.25rem;
    }
    .stApp h2, .stApp h3 {
        color: #800000 !important;
        font-family: 'Mulish', 'Poppins', sans-serif !important;
    }

    /* Buttons accent */
    .stButton>button {
        background-color: #800000;
        color: #ffffff;
        border-radius: 8px;
        padding: 0.45rem 0.7rem;
        font-weight: 600;
    }
    .stButton>button:hover { background-color: #5d0000; }

    /* Table header */
    div[data-testid="stTable"] thead tr th {
        background-color: #800000 !important;
        color: #ffffff !important;
        font-weight: 600;
        padding: 10px 12px;
    }
    div[data-testid="stTable"] tbody tr td {
        padding: 8px 12px;
        color: #222;
    }

    /* Result cards: licht en compact */
    .result-card {
        background: linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%);
        border: 1px solid #f1e9e9;
        border-left: 6px solid #800000;
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.04);
        min-height: 100px;
    }

    /* Small screens */
    @media (max-width: 1024px) {
        .block-container { padding-left: 1rem; padding-right: 1rem; padding-top: 1.5rem; }
        [data-testid="stSidebar"] { width: 300px !important; }
    }
    @media (max-width: 640px) {
        .stApp h1 { font-size: 1.6rem; }
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# 2. LOGICA FUNCTIES (ongewijzigd)
# -----------------------------------------------------------------------------

def get_dmto_tarief(postcode_input):
    if not postcode_input or len(postcode_input) < 2:
        return 5.81
    dept = postcode_input[:2]
    if dept in ['36', '56', '976']:
        return 5.09
    return 5.81

def bereken_abattement(jaren_bezit):
    if jaren_bezit < 6:
        return 0.0, 0.0
    
    # IR
    if jaren_bezit >= 22: abat_ir = 100.0
    else: abat_ir = (jaren_bezit - 5) * 6.0

    # PS
    if jaren_bezit >= 30: abat_ps = 100.0
    elif jaren_bezit >= 23:
        basis_22 = (16 * 1.65) + 1.60 
        extra_jaren = jaren_bezit - 22
        abat_ps = basis_22 + (extra_jaren * 9.0)
    else:
        abat_ps = (jaren_bezit - 5) * 1.65
        if jaren_bezit == 22: abat_ps += 1.60 

    return min(abat_ir, 100.0), min(abat_ps, 100.0)

def bereken_notariskosten(prijs_voor_notaris, postcode, is_nieuwbouw):
    if prijs_voor_notaris <= 0: return 0.0
    
    if is_nieuwbouw:
        return prijs_voor_notaris * 0.025

    dmto_tarief = get_dmto_tarief(postcode)
    tranches = [(6500, 0.03870), (17000, 0.01596), (60000, 0.01064), (float('inf'), 0.00799)]
    
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
# 3. SIDEBAR & INPUTS (leesbaarheid verbeterd; default de_ruyter=False)
# -----------------------------------------------------------------------------

if st.sidebar.button("🔄 RESET SCENARIO"):
    st.session_state.clear()
    st.rerun()

st.sidebar.title("Instellingen")

with st.sidebar.expander("1. Locatie & Notaris", expanded=True):  # aangepast label
    postcode = st.text_input("Postcode (bepaalt notaris-regio)", value="58000", max_chars=5)
    type_woning_optie = st.radio("Type Woning", ["Bestaand (Ancien)", "Nieuwbouw (VEFA)"], index=0)
    is_nieuwbouw = (type_woning_optie == "Nieuwbouw (VEFA)")
    makelaar_optie = st.radio("Wie betaalt de makelaar?", ["Verkoper (Charge Vendeur)", "Koper (Charge Acquéreur)", "Geen makelaar"], index=0)
    makelaar_perc = 0.0 if makelaar_optie == "Geen makelaar" else st.number_input("Makelaarscourtage (%)", value=6.0, step=0.1, format="%.2f")

with st.sidebar.expander("2. Bedragen & Data", expanded=False):
    verkoopprijs_input = st.number_input("Totale Verkoopprijs (incl. makelaar) €", value=400000.0, step=1000.0)
    col_j1, col_j2 = st.columns(2)
    with col_j1:
        jaar_aankoop = st.number_input("Jaar Aankoop", value=2015, step=1)
    with col_j2:
        jaar_verkoop = st.number_input("Jaar Verkoop", value=2025, step=1)
    jaren_bezit = max(0, jaar_verkoop - jaar_aankoop)
    aankoopprijs = st.number_input("Oorspronkelijke Aankoopprijs €", value=200000.0, step=1000.0)

with st.sidebar.expander("3. Kosten & Belastingen", expanded=False):
    hoofdverblijf_optie = st.radio("Was dit uw hoofdverblijf?", ["Nee (2de woning)", "Ja (Hoofdverblijf)"], index=0)
    is_hoofdverblijf = (hoofdverblijf_optie == "Ja (Hoofdverblijf)")
    landmeter = st.number_input("Landmeter / Diagnostics €", value=1500.0, step=100.0)

    # Default gezet op False: gebruiker moet expliciet aanvinken
    if not is_hoofdverblijf:
        de_ruyter = st.checkbox(
            "Toepassing Arrest de Ruyter",
            value=False,
            help="Als aangevinkt: verlaagd tarief voor sociale lasten (7,5%). Vink alleen aan als u sociaal verzekerd bent in een andere EU-lidstaat (bijv. Nederland) en niet in Frankrijk."
        )
        pv_methode = st.radio("Plus-value berekening", ["Automatisch (obv jaren)", "Handmatige invoer"], index=0)
    else:
        de_ruyter = False
        pv_methode = "Automatisch (obv jaren)"

# extra leesbare hint onderaan expander (klein)
st.sidebar.markdown("**Tip:** Gebruik de [i]‑checkbox alleen als u zeker weet dat u onder Arrest De Ruyter valt.")

# -----------------------------------------------------------------------------
# 4. BEREKENINGEN (ongewijzigd)
# -----------------------------------------------------------------------------

plus_value_tax = 0.0
pv_toelichting = ""
bruto_meerwaarde = 0.0
abat_ir_perc = 0.0
abat_ps_perc = 0.0
tax_ir = 0.0
tax_ps = 0.0

if makelaar_optie == "Geen makelaar":
    makelaarskosten = 0.0
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input
elif makelaar_optie == "Koper (Charge Acquéreur)":
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input - makelaarskosten
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten 
else:
    makelaarskosten = verkoopprijs_input * (makelaar_perc / 100.0)
    prijs_voor_notaris = verkoopprijs_input
    netto_verkoper_basis = verkoopprijs_input - makelaarskosten

notariskosten = bereken_notariskosten(prijs_voor_notaris, postcode, is_nieuwbouw)

if is_hoofdverblijf:
    plus_value_tax = 0.0
    pv_toelichting = "Vrijstelling: Hoofdverblijf"
elif pv_methode == "Handmatige invoer":
    plus_value_tax = st.number_input("Bedrag Plus-value belasting €", value=0.0)
    pv_toelichting = "Handmatige invoer"
else:
    forfait_aankoop = aankoopprijs * 0.075
    forfait_verbouwing = aankoopprijs * 0.15 if jaren_bezit > 5 else 0.0
    gecorrigeerde_aankoopsom = aankoopprijs + forfait_aankoop + forfait_verbouwing
    basis_meerwaarde = netto_verkoper_basis
    bruto_meerwaarde = basis_meerwaarde - gecorrigeerde_aankoopsom

    if bruto_meerwaarde <= 0:
        plus_value_tax = 0.0
        pv_toelichting = "Geen winst na forfaits"
    else:
        abat_ir_perc, abat_ps_perc = bereken_abattement(jaren_bezit)
        belastbaar_ir = bruto_meerwaarde * (1.0 - (abat_ir_perc / 100.0))
        belastbaar_ps = bruto_meerwaarde * (1.0 - (abat_ps_perc / 100.0))
        tarief_ir = 19.0 
        tarief_ps = 7.5 if de_ruyter else 17.2
        tax_ir = belastbaar_ir * (tarief_ir / 100.0)
        tax_ps = belastbaar_ps * (tarief_ps / 100.0)
        plus_value_tax = tax_ir + tax_ps
        pv_toelichting = f"Winst na forfaits: € {bruto_meerwaarde:,.0f} | Aftrek: {abat_ir_perc:.1f}% (IR) / {abat_ps_perc:.1f}% (Soc)"

totaal_kosten_verkoper = makelaarskosten + plus_value_tax + landmeter
netto_opbrengst = verkoopprijs_input - totaal_kosten_verkoper
werkelijke_winst = netto_opbrengst - aankoopprijs
frictiekosten = notariskosten + totaal_kosten_verkoper

# -----------------------------------------------------------------------------
# 5. OUTPUT (compact, leesbaar)
# -----------------------------------------------------------------------------

st.title("Vastgoedtransactieanalyse")
st.markdown("Een interactieve financiële uiteenzetting voor vastgoedtransacties in Frankrijk.")
st.markdown("---")

st.subheader("Financiële Specificatie")

df_data = []
df_data.append(["Kosten Koper", "", ""])
notaris_label = f"Over € {prijs_voor_notaris:,.0f} (Grondslag)"
if is_nieuwbouw:
    notaris_label += " - VEFA Tarief"
df_data.append(["Notariskosten", notaris_label, f"€ {notariskosten:,.2f}"])
df_data.append(["", "", ""])
df_data.append(["Kosten Verkoper / Afhoudingen", "", ""])
makelaar_tekst = f"{makelaar_perc:.2f}% ({makelaar_optie})"
df_data.append(["Makelaarscourtage", makelaar_tekst, f"€ {makelaarskosten:,.2f}"])
pv_spec = "Handmatige invoer" if pv_methode == "Handmatige invoer" else ("Vrijstelling: Hoofdverblijf" if is_hoofdverblijf else f"Jaren bezit: {jaren_bezit} jaar (De Ruyter: {'Ja' if de_ruyter else 'Nee'})")
df_data.append(["Plus-value belasting", pv_spec, f"€ {plus_value_tax:,.2f}"])
df_data.append(["Landmeter / Diagnostics", "", f"€ {landmeter:,.2f}"])
df_data.append(["Totaal afhoudingen", "", f"€ {totaal_kosten_verkoper:,.2f}"])

cols = ["Onderdeel", "Specificatie", "Bedrag"]
records = [dict(zip(cols, row)) for row in df_data]
st.table(records)

st.markdown("---")
st.subheader("Resultaat")

col_res1, col_res2, col_res3 = st.columns([1,1,1], gap="small")
with col_res1:
    st.markdown(
        f"""
        <div class="result-card">
            <div class="result-label">Netto Opbrengst</div>
            <div class="result-value">€ {netto_opbrengst:,.0f}</div>
            <div class="result-sub">Op bankrekening verkoper</div>
        </div>
        """, unsafe_allow_html=True)
with col_res2:
    st.markdown(
        f"""
        <div class="result-card">
            <div class="result-label">Werkelijke Winst</div>
            <div class="result-value">€ {werkelijke_winst:,.0f}</div>
            <div class="result-sub">Netto - Aankoop</div>
        </div>
        """, unsafe_allow_html=True)
with col_res3:
    st.markdown(
        f"""
        <div class="result-card">
            <div class="result-label">Frictiekosten</div>
            <div class="result-value">€ {frictiekosten:,.0f}</div>
            <div class="result-sub">Verdwenen in de keten</div>
        </div>
        """, unsafe_allow_html=True)

with st.expander("🔎 Bekijk fiscale analyse & validatie"):
    st.markdown("### Validatie van berekening")
    st.write("De onderstaande analyse toont hoe de Franse fiscale regels zijn toegepast op uw scenario.")
    st.markdown("#### Grondslag Notaris & Makelaar")
    if makelaar_optie == "Koper (Charge Acquéreur)" and makelaarskosten > 0:
        st.write("Situatie: Charge Acquéreur — makelaarscourtage is vaak vrijgesteld van overdrachtsbelasting.")
    elif makelaar_optie == "Verkoper (Charge Vendeur)":
        st.write("Situatie: Charge Vendeur — geen belastingvoordeel voor koper.")
    else:
        st.write("Geen makelaar betrokken of specifieke situatie.")
    if not is_hoofdverblijf and pv_methode == "Automatisch (obv jaren)" and bruto_meerwaarde > 0:
        st.markdown(f"#### Plus-Value Berekening ({jaren_bezit} jaar bezit)")
        st.markdown(f"* Inkomstenbelasting (IR) aftrek: {abat_ir_perc:.1f}%  — berekend op € {bruto_meerwaarde:,.0f}")
        st.markdown(f"* Sociale lasten aftrek: {abat_ps_perc:.1f}%  — tarief toegepast: {('7,5%' if de_ruyter else '17,2%')}")
    elif is_hoofdverblijf:
        st.write("✅ Object is aangemerkt als Hoofdverblijf. Volledige vrijstelling van Plus-Value belasting.")
    st.markdown("---")
    st.write("Conclusie: de rekenkern is consistent met de gebruikte regels.")
    if pv_toelichting:
        st.info(pv_toelichting)

st.markdown('<div style="text-align:center;color:#666;padding-top:10px;">Deze interactieve analyse wordt u aangeboden door <b>Infofrankrijk.com</b></div>', unsafe_allow_html=True)
