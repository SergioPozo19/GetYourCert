"""Flag multiple-choice questions whose explanation seems to describe a different option than the marked answer.
   Heuristic with many false positives: review each hit by hand.  python tools/audit_answer_mismatch.py [exam ...]"""
import json, glob, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STOP = set('the a an of to in and or for is are be with on by as that this it its from at not no can only which what when your you their they them more most than into over under each all any also such using use used via per if then so do does was were has have had will would should could may might must one two both other others new same instead without within between'.split())

def toks(s):
    return [w for w in re.findall(r"[a-z0-9][a-z0-9\-\.]+", s.lower()) if w not in STOP and len(w) > 2]

out = collections.defaultdict(list)
only = sys.argv[1:]
for f in sorted(glob.glob(os.path.join(ROOT, 'questions', '*.json'))):
    ex = os.path.basename(f)[:-5]
    if only and ex not in only: continue
    for q in json.load(open(f, encoding='utf-8')):
        if q['type'] != 'mc' or not q.get('opts_en') or not q.get('exp_en'): continue
        corr = q['correct'] if isinstance(q['correct'], list) else [q['correct']]
        if len(corr) != 1: continue
        exp = toks(q['exp_en'])
        # first sentence of the explanation usually states the right answer
        first = toks(re.split(r'(?<=[.!?])\s', q['exp_en'])[0])
        qt = set(toks(q['q_en']))
        scores = []
        for i, o in enumerate(q['opts_en']):
            ot = [w for w in toks(o) if w not in qt]   # words that distinguish the option
            if not ot: scores.append(0); continue
            s1 = sum(1 for w in set(ot) if w in first) / len(set(ot))
            s2 = sum(1 for w in set(ot) if w in exp) / len(set(ot))
            scores.append(s1 * 2 + s2)
        best = max(range(len(scores)), key=lambda i: scores[i])
        c = corr[0]
        if best != c and scores[best] - scores[c] > 0.9 and scores[c] < 1.0:
            out[ex].append((q['id'], c, best, round(scores[c], 2), round(scores[best], 2)))
for ex, items in out.items():
    print(ex, len(items), [i[0] for i in items])
