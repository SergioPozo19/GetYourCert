"""Flag questions that mention retired or renamed Microsoft products (review by hand: many are fine as wrong options).
   python tools/audit_outdated_terms.py [exam ...]"""
import json, glob, re, os, collections, sys
ROOT = r'C:\Users\sergio\proyectos\GetYourCert'
TERMS = {
    r'\bAzure (AD|Active Directory)\b(?! Connect)': 'Azure AD -> Microsoft Entra ID',
    r'\bAzure AD Connect\b': 'Azure AD Connect -> Entra Connect',
    r'Azure Security Center': '-> Defender for Cloud',
    r'Azure Sentinel': '-> Microsoft Sentinel',
    r'Azure Defender\b': '-> Defender for Cloud plans',
    r'Azure Purview': '-> Microsoft Purview',
    r'Microsoft Endpoint Manager': '-> Intune admin center',
    r'Defender ATP|Microsoft Defender Advanced Threat|Office 365 ATP|Azure ATP': 'old Defender names',
    r'\bMCAS\b|Microsoft Cloud App Security': '-> Defender for Cloud Apps',
    r'Basic (SKU )?(load balancer|Load Balancer)|Load Balancer Basic|Basic Load Balancer': 'Basic LB retired 2025-09-30',
    r'Basic (SKU )?public IP|Basic SKU public|public IP addresses? .{0,30}Basic': 'Basic public IP retired 2025-09-30',
    r'unmanaged disk': 'unmanaged disks retired 2025-09-30',
    r'\bLUIS\b': 'LUIS retired',
    r'QnA Maker': 'QnA Maker retired',
    r'Power Virtual Agents': '-> Copilot Studio',
    r'Bing Chat Enterprise': '-> Copilot',
    r'Log Analytics agent|\bMMA\b|Microsoft Monitoring Agent': 'MMA retired 2024-08 -> AMA',
    r'Azure Blueprints?': 'Blueprints deprecated',
    r'TLS 1\.[01]': 'TLS 1.0/1.1',
    r'Data Lake Storage Gen1': 'ADLS Gen1 retired',
    r'Cloud Services \(classic\)|classic deployment model': 'classic retired',
    r'Skype for Business': 'SfB retired',
    r'Teams classic|classic Teams': 'classic Teams retired',
    r'Cognitive Services': '-> Azure AI services',
    r'Azure OpenAI Studio|Azure AI Studio': '-> Foundry',
    r'Windows 10': 'Windows 10 end of support 2025-10-14',
    r'Front Door \(classic\)|Front Door classic': 'Front Door classic retiring',
    r'App Service Environment v[12]\b': 'ASE v1/v2 retired',
    r'Microsoft 365 Defender\b': '-> Defender XDR',
    r'Azure Information Protection': '-> Purview Information Protection',
}
only = sys.argv[1:]
for f in sorted(glob.glob(os.path.join(ROOT, 'questions', '*.json'))):
    ex = os.path.basename(f)[:-5]
    if only and ex not in only: continue
    qs = json.load(open(f, encoding='utf-8'))
    struct = []; hits = collections.defaultdict(list)
    for q in qs:
        n = len(q.get('opts_en') or [])
        if q['type'] == 'mc':
            if not q.get('correct') or any(c >= n or c < 0 for c in q['correct']): struct.append((q['id'], 'correct out of range'))
            if n and len(set(o.strip().lower() for o in q['opts_en'])) < n: struct.append((q['id'], 'duplicate options'))
            if q.get('exp_es') is None or q.get('exp_en') is None: struct.append((q['id'], 'missing explanation'))
        txt = ' '.join(str(q.get(k, '')) for k in ('q_en', 'opts_en', 'exp_en', 'pre_en', 'post_en', 'rows'))
        for pat, why in TERMS.items():
            if re.search(pat, txt): hits[why].append(q['id'])
    print('==', ex, len(qs), 'struct:', struct[:10])
    for why, ids in hits.items(): print('   ', why, len(ids), ids[:15])
