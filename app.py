import streamlit as st
import pandas as pd

# -----------------------------------------------------------------------------
# 1. CONFIGURATIE & HUISSTIJL
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="Transactie-analyse v2.6",
    page_icon="🏠",
    layout="wide"
)

# Custom CSS voor Huisstijl: Steunkleur #800000 en modern licht lettertype
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
    /* Tabel styling */
    div[data-testid="stTable"] {
        font-weight: 300;
    }
    .small-text {
        font-size: 0.85rem;
        color: #666;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# 2. FUNCTIES VOOR BEREKENINGEN
# -----------------------------------------------------------------------------

def bereken_notariskosten(prijs, dmto_tarief=5.81):
    """
    Berekent Franse notariskosten gebaseerd op de wettelijke tranches (émoluments),
    DMTO, TVA en diverse kosten.
    """
    # 1. Émoluments du notaire (Tranches volgens Arrêté du 28 février 2020)
    tranches = [
        (6500, 0.03870),
        (17000, 0.01596),
        (60000, 0.01064),
        (float('inf'), 0.00799)
    ]
    
    emoluments = 0.0
    resterend_bedrag = prijs
    vorige_grens = 0
    
    for grens, percentage in tranches:
        if prijs > vorige_grens:
            schijf_bedrag = min(prijs, grens) - vorige_grens
            emoluments += schijf_bedrag * percentage
            vorige_grens = grens
        else:
            break
            
    # 2. TVA (20%) op émoluments
    tva_emoluments = emoluments * 0.20
    
    # 3. Droits de mutation (DMTO) - Belasting
    dmto = prijs * (dmto_tarief / 100.0)
    
    # 4. Contribution de sécurité immobilière (0.10%)
    csi = prijs * 0.0010
    
    # 5. Débours et frais divers (Schatting)
    frais_divers = 1300.00 
    
    totaal = emoluments + tva_emoluments + dmto + csi + frais_divers
    
    return {
        "totaal": totaal,
        "dmto": dmto,
        "emoluments_excl_tva": emoluments,
        "tva": tva_emoluments,
        "csi": csi,
        "divers": frais_divers
    }

# -----------------------------------------------------------------------------
# 3. SESSIE STATE & RESET
# -----------------------------------------------------------------------------

if 'reset_counter' not in st.session_state:
    st.session_state['reset_counter'] = 0

def reset_app():
    st.session_state.clear()
    st.session_state['reset_counter'] += 1
    st.rerun()

# -----------------------------------------------------------------------------
# 4. SIDEBAR INPUTS
# -----------------------------------------------------------------------------

st.sidebar.title("Instellingen Scenario")

# Reset knop
if st.sidebar.button("🔄 RESET SCENARIO"):
    reset_app()

st.sidebar.markdown("---")
st.sidebar.subheader("1. Verkoop")
verkoopprijs = st.sidebar.number_input("Bruto Verkoopprijs (€)", value=400000.0, step=1000.0, format="%.2f")

st.sidebar.subheader("2. Aankoop & Geschiedenis")
aankoopprijs = st.sidebar.number_input("Oorspronkelijke Aankoopprijs (€)", value=200000.0, step=1000.0, format="%.2f")

st.sidebar.subheader("3. Kosten Parameters")
makelaar_input = st.sidebar.number_input("Makelaarscourtage (€)", value=20000.0, step=500.0, format="%.2f")
landmeter_input = st.sidebar.number_input("Landmeter / Géomètre (€)", value=1500.0, step=100.0, format="%.2f")
dmto_pct = st.sidebar.number_input("DMTO Tarief Notaris (%)", value=5.81, step=0.01, format="%.2f")

st.sidebar.markdown("---")
st.sidebar.subheader("4. Plus-Value Belasting")

# De Ruyter Toggle
de_ruyter_active = st.sidebar.toggle("Toepassing Arrest de Ruyter?", value=True, help="Vink aan indien verkoper sociaal verzekerd is in NL (of elders in EU/EER) en niet in Frankrijk. Verlaagt sociale lasten van 17,2% naar 7,5%.")

pv_mode = st.sidebar.radio("Berekeningsmethode:", ["Handmatige invoer (Vast bedrag)", "Automatische schatting"], index=0)

plus_value_tax = 0.0
pv_details = ""

if pv_mode == "Handmatige invoer (Vast bedrag)":
    plus_value_tax = st.sidebar.number_input("Totaal Plus-value belasting (€)", value=39259.35, step=100.0, format="%.2f")
    pv_toelichting = "Handmatig ingevoerd bedrag"
    
else:
    # Automatische schatting
    st.sidebar.info("ℹ️ Schatting obv: 15% verbouwingsforfait + 7.5% aankoopkostenforfait (standaard na 5 jaar).")
    
    # Forfaits
    forfait_aankoop = aankoopprijs * 0.075
    forfait_verbouwing = aankoopprijs * 0.15
    
    # Aangepaste aankoopsom
    aankoopsom_gecorrigeerd = aankoopprijs + forfait_aankoop + forfait_verbouwing
    
    bruto_winst = verkoopprijs - aankoopsom_gecorrigeerd - makelaar_input
    
    if bruto_winst < 0:
        bruto_winst = 0
    
    # Tarieven bepalen
    tarief_ir = 19.0 # Inkomstenbelasting (voor niet-residenten vaak 19%, residenten progressief)
    
    if de_ruyter_active:
        tarief_social = 7.5  # Prélèvement de solidarité
        label_social = "7,5% (De Ruyter)"
    else:
        tarief_social = 17.2 # Volledige CSG/CRDS
        label_social = "17,2% (Standaard)"
        
    totaal_tarief = tarief_ir + tarief_social
    
    # Let op: dit is een vereenvoudiging (geen aftrek per bezitsjaar meegenomen voor UI eenvoud)
    st.sidebar.markdown(f"**Toegepaste tarieven:**")
    st.sidebar.markdown(f"- Impôt sur le Revenu: {tarief_ir}%")
    st.sidebar.markdown(f"- Sociale lasten: {label_social}")
    
    # Slider voor abattement (aftrek bezitsduur) simulatie
    aftrek_perc = st.sidebar.slider("Gemiddelde aftrek bezitsduur (%)", 0, 100, 0, help="Hoe langer het bezit, hoe hoger de aftrek (abattement).")
    
    belastbare_winst = bruto_winst * ((100 - aftrek_perc) / 100)
    plus_value_tax = belastbare_winst * (totaal_tarief / 100.0)
    
    pv_toelichting = f"Schatting ({totaal_tarief}% op belastbare winst)"

# -----------------------------------------------------------------------------
# 5. HOOFDBEREKENINGEN
# -----------------------------------------------------------------------------

# Notariskosten berekenen
notaris_data = bereken_notariskosten(verkoopprijs, dmto_pct)
notariskosten_totaal = notaris_data['totaal']

# Totale kosten verkoper
kosten_verkoper_totaal = makelaar_input + plus_value_tax + landmeter_input

# Netto opbrengst
netto_opbrengst = verkoopprijs - kosten_verkoper_totaal

# Werkelijke winst
werkelijke_winst = netto_opbrengst - aankoopprijs

# Frictiekosten
frictiekosten = notariskosten_totaal + kosten_verkoper_totaal

# -----------------------------------------------------------------------------
# 6. UI LAYOUT & WEERGAVE
# -----------------------------------------------------------------------------

st.title("Transactie-analyse v2.6")
st.markdown("Een interactieve financiële uiteenzetting voor vastgoedtransacties in Frankrijk.")

if de_ruyter_active:
    st.success("✅ **De Ruyter Arrest Actief:** Sociale lasten verlaagd naar 7,5% (solidariteitsheffing).")

st.markdown("---")

# Twee kolommen voor de hoofdtabel
col1, col2 = st.columns([1.5, 1])

with col1:
    st.subheader("Financiële Uiteenzetting")
    
    # Dataframe voor weergave
    data = [
        ["**1. Kosten Koper**", "", ""],
        ["Notariskosten", "DMTO (5,81%) + wettelijk tarief + btw", f"€ {notariskosten_totaal:,.2f}"],
        ["", "", ""],
        ["**2. Kosten Verkoper**", "", ""],
        ["Makelaarscourtage", "In mindering gebracht op verkoopprijs", f"€ {makelaar_input:,.2f}"],
        ["Plus-value-belasting", pv_toelichting, f"€ {plus_value_tax:,.2f}"],
        ["Landmeter (géomètre)", "", f"€ {landmeter_input:,.2f}"],
        ["**Totaal kosten verkoper**", "", f"**€ {kosten_verkoper_totaal:,.2f}**"],
    ]
    
    df = pd.DataFrame(data, columns=["Onderdeel", "Specificatie", "Bedrag"])
    st.table(df)
    
    with st.expander("Details Notariskosten (Koper)"):
        st.write(f"- DMTO (Belasting): € {notaris_data['dmto']:,.2f}")
        st.write(f"- Émoluments (Notaris salaris): € {notaris_data['emoluments_excl_tva']:,.2f}")
        st.write(f"- TVA (20% op salaris): € {notaris_data['tva']:,.2f}")
        st.write(f"- Div. aktekosten (Schatting): € {notaris_data['divers']:,.2f}")
        st.caption("*Berekening gebaseerd op wettelijke staffels (Arrêté du 28 février 2020)*")

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
    st.info("Definitie: som van alle kosten koper + kosten verkoper die niet terugkomen in de werkelijke winst.")

# -----------------------------------------------------------------------------
# 7. SAMENVATTING TEKST
# -----------------------------------------------------------------------------
st.markdown("---")
st.subheader("Samenvatting")

st.markdown(f"""
Bij een verkoop van **€ {verkoopprijs:,.0f}** en een oorspronkelijke aanschaf van **€ {aankoopprijs:,.0f}**, 
bedraagt de werkelijke winst onder de streep **€ {werkelijke_winst:,.2f}**. 

Er verdwijnt in totaal **€ {frictiekosten:,.2f}** aan kosten in de transactieketen (notaris, makelaar, belastingen).
""")
