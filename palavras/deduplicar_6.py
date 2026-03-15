"""
Remove duplicatas de normalização dos arquivos solucoes_6.txt e validas_6.txt.
Para cada grupo de palavras que normalizam para a mesma forma,
mantém apenas a mais frequente segundo wordfreq. Em caso de empate,
prefere a forma sem acento ou a primeira em ordem alfabética.
"""

import unicodedata
from pathlib import Path
from collections import defaultdict
from wordfreq import word_frequency

BASE    = Path(__file__).parent

def normalize(word):
    nfd = unicodedata.normalize('NFD', word)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

def score(word):
    freq = word_frequency(normalize(word).lower(), 'pt')
    no_accent_bonus = 1 if word == normalize(word) else 0
    return (freq, no_accent_bonus)

def dedup(lines):
    groups = defaultdict(list)
    for w in lines:
        groups[normalize(w)].append(w)

    result  = []
    removed = []
    for key, variants in groups.items():
        best = max(variants, key=score)
        result.append(best)
        for v in variants:
            if v != best:
                removed.append((key, v, best))

    return sorted(result), removed

for fname in ['solucoes_6.txt', 'validas_6.txt']:
    path = BASE / fname
    lines = [l.strip() for l in path.read_text(encoding='utf-8').splitlines() if l.strip()]
    before = len(lines)

    deduped, removed = dedup(lines)
    path.write_text('\n'.join(deduped), encoding='utf-8')

    print(f"\n{fname}: {before} -> {len(deduped)} ({before - len(deduped)} removidas)")
    if removed[:10]:
        print("  Exemplos removidos (forma_base, removida, mantida):")
        for key, rem, kept in removed[:10]:
            print(f"    {key}: removeu '{rem}', manteve '{kept}'")
