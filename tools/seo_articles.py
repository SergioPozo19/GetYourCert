"""Editorial articles (one ES + one EN page each), built by seo_build.py. Section items: str = paragraph, list = bullet list."""

ARTICLES = [
 dict(es='ms-102-a-ab-650', en='ms-102-to-ab-650', exams=['ab-650', 'ms-102'], cta='ab-650', on=['ab-650', 'ms-102'],
  title_es='MS-102 se retira: qué cambia en AB-650 y cómo prepararlo | EarnYourCert',
  title_en='MS-102 retirement: what changes in AB-650 and how to prepare | EarnYourCert',
  h1_es='De MS-102 a AB-650: qué cambia y qué hacer', h1_en='From MS-102 to AB-650: what changes and what to do',
  desc_es='Microsoft retira MS-102 el 30 de noviembre de 2026 y lo sustituye por AB-650. Qué temas se mantienen, qué es nuevo (Copilot y agentes) y qué hacer según tu situación.',
  desc_en='Microsoft retires MS-102 on November 30, 2026 and replaces it with AB-650. Which topics stay, what is new (Copilot and agents) and what to do in your situation.',
  sections_es=[
   ('El cambio en pocas palabras', [
    'MS-102 (Microsoft 365 Administrator) se puede hacer hasta el 30 de noviembre de 2026. Su sustituto es AB-650, Administering Microsoft 365 and AI Services, que todavía está en beta. No es un examen totalmente nuevo: conserva casi todo el núcleo de MS-102 y le suma un bloque grande sobre Copilot y agentes de IA.']),
   ('Qué se mantiene', [
    'Si ya estudiaste MS-102, la mayor parte te sirve tal cual:',
    ['Configuración del inquilino, dominios, licencias y roles de administrador',
     'Identidad con Microsoft Entra: sincronización, MFA, acceso condicional y PIM',
     'Seguridad con Microsoft Defender XDR y Defender para Office 365',
     'Cumplimiento con Microsoft Purview: etiquetas, DLP, retención y auditoría']]),
   ('Qué es nuevo', [
    'El dominio "Administrar y proteger los servicios de IA en Microsoft 365" pesa entre el 35 y el 40% del examen y no existía en MS-102:',
    ['Preparar el inquilino para Copilot: licencias y, sobre todo, la sobreexposición de datos en SharePoint',
     'SharePoint Advanced Management y DSPM para IA para controlar a qué datos llega Copilot',
     'Gobernanza de agentes: registro de agentes, Entra Agent ID y Agent 365',
     'Informes de uso y adopción con Copilot Control System'],
    'Los otros dos dominios son configurar el inquilino y las cargas de trabajo (20-25%) y gobernar y proteger (40-45%).']),
   ('Qué hacer según tu caso', [
    ['Tienes el examen MS-102 reservado antes del 30 de noviembre: preséntate. Aprobarlo sigue dándote la certificación.',
     'Aún no has empezado: ve directamente a AB-650 para no estudiar dos veces.',
     'Ya tienes la certificación de MS-102: sigue siendo válida. Revisa en tu perfil de Microsoft Learn cómo y cuándo renovarla.',
     'Estudiabas MS-102 y no llegas a la fecha: aprovecha lo estudiado y añade el bloque de Copilot y agentes.']]),
   ('Cómo preparar AB-650 viniendo de MS-102', [
    'Repasa rápido identidad, Defender y Purview con preguntas de práctica para comprobar que lo sigues dominando, y dedica la mayor parte del tiempo al bloque de IA, que es lo que no conoces. Como el examen está en beta, el resultado llega unas semanas después de que cierre la fase beta.']),
  ],
  sections_en=[
   ('The change in short', [
    "MS-102 (Microsoft 365 Administrator) can be taken until November 30, 2026. Its replacement is AB-650, Administering Microsoft 365 and AI Services, which is still in beta. It isn't an entirely new exam: it keeps almost all of the MS-102 core and adds a large block on Copilot and AI agents."]),
   ('What stays', [
    'If you already studied MS-102, most of it still applies:',
    ['Tenant setup, domains, licenses and admin roles',
     'Identity with Microsoft Entra: sync, MFA, Conditional Access and PIM',
     'Security with Microsoft Defender XDR and Defender for Office 365',
     'Compliance with Microsoft Purview: labels, DLP, retention and audit']]),
   ('What is new', [
    'The "Manage and secure AI services in Microsoft 365" domain is 35-40% of the exam and did not exist in MS-102:',
    ['Preparing the tenant for Copilot: licensing and, above all, data oversharing in SharePoint',
     'SharePoint Advanced Management and DSPM for AI to control what data Copilot can reach',
     'Agent governance: agent registry, Entra Agent ID and Agent 365',
     'Usage and adoption reports with Copilot Control System'],
    'The other two domains are configuring tenants and workloads (20-25%) and governing and securing them (40-45%).']),
   ('What to do in your situation', [
    ['You have MS-102 booked before November 30: sit it. Passing still earns the certification.',
     "You haven't started: go straight to AB-650 so you don't study twice.",
     'You already hold the MS-102 certification: it stays valid. Check your Microsoft Learn profile for how and when to renew it.',
     "You were studying MS-102 and won't make the date: keep what you learned and add the Copilot and agents block."]]),
   ('How to prepare AB-650 coming from MS-102', [
    "Quickly review identity, Defender and Purview with practice questions to confirm you still know them, and spend most of your time on the AI block, which is what's new to you. Because the exam is in beta, results arrive a few weeks after the beta closes."]),
  ],
  faq_es=[('¿Hasta cuándo se puede hacer MS-102?', 'Hasta el 30 de noviembre de 2026 a las 23:59 (hora central de EE. UU.). Después Microsoft lo retira y ya no se puede reservar.'),
          ('¿AB-650 es más difícil que MS-102?', 'Tiene un temario parecido en identidad, seguridad y cumplimiento, pero añade un 35-40% de contenido sobre Copilot y agentes. Para quien ya conoce MS-102, lo difícil es ese bloque nuevo.'),
          ('¿Pierdo la certificación si tengo MS-102?', 'No. Una certificación aprobada sigue siendo válida hasta su fecha de caducidad; consulta en tu perfil de Microsoft Learn las opciones de renovación.')],
  faq_en=[('Until when can I take MS-102?', 'Until November 30, 2026 at 11:59 PM US Central Time. After that Microsoft retires it and it can no longer be booked.'),
          ('Is AB-650 harder than MS-102?', 'Its identity, security and compliance content is similar, but it adds 35-40% on Copilot and agents. For someone who knows MS-102, that new block is the hard part.'),
          ('Do I lose my certification if I hold MS-102?', 'No. An earned certification stays valid until its expiry date; check your Microsoft Learn profile for renewal options.')]),
 dict(es='por-donde-empezar-certificaciones-microsoft', en='which-microsoft-certification-first',
  exams=['az-900', 'ab-900', 'sc-900', 'ai-901'], cta=None, on='all',
  title_es='¿Por qué certificación de Microsoft empezar? Rutas por perfil | EarnYourCert',
  title_en='Which Microsoft certification should you take first? Paths by role | EarnYourCert',
  h1_es='¿Por qué certificación de Microsoft empiezo?', h1_en='Which Microsoft certification should I take first?',
  desc_es='Rutas de certificación de Microsoft según tu perfil: Azure, Microsoft 365, seguridad, datos e IA. Qué examen hacer primero y cuál después.',
  desc_en='Microsoft certification paths by role: Azure, Microsoft 365, security, data and AI. Which exam to take first and which next.',
  sections_es=[
   ('Empieza por un Fundamentals si eres nuevo', [
    'Los exámenes Fundamentals no piden experiencia, duran unos 45 minutos y la certificación no caduca. Elige el del área en la que quieres trabajar:',
    ['AZ-900: nube y Azure en general. La opción más segura si dudas.',
     'AB-900: Microsoft 365, Copilot y agentes.',
     'SC-900: seguridad, cumplimiento e identidad.',
     'AI-901: IA en Azure con Microsoft Foundry.'],
    'No son obligatorios para los exámenes de nivel Associate, pero asientan el vocabulario que esos exámenes dan por sabido.']),
   ('Si quieres administrar Azure', [
    ['AZ-900 → AZ-104 (Azure Administrator) → AZ-305 (Azure Solutions Architect Expert).',
     'AZ-104 es la certificación de Azure más pedida en ofertas de empleo. Para el título Expert, AZ-305 exige tener también AZ-104.']]),
   ('Si administras Microsoft 365', [
    ['AB-900 → AB-650 (administración de Microsoft 365 y servicios de IA), que sustituye a MS-102.',
     'Para dispositivos con Intune: MD-102. Para Teams: MS-700 y, si llevas telefonía y salas, MS-721.']]),
   ('Si te interesa la ciberseguridad', [
    ['SC-900 → SC-300 (identidad y acceso), SC-200 (operaciones de seguridad) o SC-500 (seguridad en la nube e IA).',
     'SC-300 encaja si vienes de administrar usuarios; SC-200 si quieres trabajar en un SOC; SC-500 si ya administras Azure.']]),
   ('Si trabajas con datos e IA', [
    ['PL-300 (analista de datos con Power BI) es el primer paso habitual en datos.',
     'DP-600 (ingeniero de análisis con Microsoft Fabric) es el siguiente nivel.',
     'AI-901 cubre los fundamentos de IA en Azure.']]),
   ('Cómo saber si estás listo', [
    'Haz un simulacro completo antes de estudiar para ver de dónde partes, estudia primero los dominios con más peso y reserva el examen cuando superes el 80% de forma constante en los simulacros.']),
  ],
  sections_en=[
   ('Start with a Fundamentals exam if you are new', [
    'Fundamentals exams need no experience, last about 45 minutes and the certification never expires. Pick the one for the area you want to work in:',
    ['AZ-900: cloud and Azure in general. The safest choice if unsure.',
     'AB-900: Microsoft 365, Copilot and agents.',
     'SC-900: security, compliance and identity.',
     'AI-901: AI on Azure with Microsoft Foundry.'],
    "They aren't required for Associate exams, but they build the vocabulary those exams assume."]),
   ('If you want to administer Azure', [
    ['AZ-900 → AZ-104 (Azure Administrator) → AZ-305 (Azure Solutions Architect Expert).',
     'AZ-104 is the Azure certification most requested in job ads. For the Expert title, AZ-305 also requires AZ-104.']]),
   ('If you administer Microsoft 365', [
    ['AB-900 → AB-650 (Microsoft 365 and AI services administration), which replaces MS-102.',
     'For devices with Intune: MD-102. For Teams: MS-700 and, if you handle telephony and rooms, MS-721.']]),
   ('If you are into cybersecurity', [
    ['SC-900 → SC-300 (identity and access), SC-200 (security operations) or SC-500 (cloud and AI security).',
     'SC-300 fits if you come from user administration; SC-200 if you want to work in a SOC; SC-500 if you already administer Azure.']]),
   ('If you work with data and AI', [
    ['PL-300 (Power BI data analyst) is the usual first step in data.',
     'DP-600 (Microsoft Fabric analytics engineer) is the next level.',
     'AI-901 covers Azure AI fundamentals.']]),
   ('How to know you are ready', [
    'Take a full mock exam before studying to see where you stand, study the heaviest domains first, and book the exam once you consistently score above 80% in mock exams.']),
  ],
  faq_es=[('¿Cuál es la certificación de Microsoft más fácil?', 'Los Fundamentals, como AZ-900 o SC-900: no piden experiencia y se preparan en dos o tres semanas.'),
          ('¿Es obligatorio hacer un Fundamentals antes de un Associate?', 'No. Puedes ir directamente a AZ-104, SC-300 o PL-300, aunque un Fundamentals ayuda si el área es nueva para ti.'),
          ('¿Qué certificación de Microsoft tiene más salida?', 'Depende del área, pero AZ-104 en Azure, SC-200 en seguridad y PL-300 en datos están entre las más pedidas en ofertas de empleo.')],
  faq_en=[('Which Microsoft certification is the easiest?', 'The Fundamentals ones, such as AZ-900 or SC-900: they need no experience and take two or three weeks to prepare.'),
          ('Do I have to take a Fundamentals exam before an Associate one?', 'No. You can go straight to AZ-104, SC-300 or PL-300, though a Fundamentals exam helps if the area is new to you.'),
          ('Which Microsoft certification is most in demand?', 'It depends on the area, but AZ-104 in Azure, SC-200 in security and PL-300 in data are among the most requested in job ads.')]),
]
