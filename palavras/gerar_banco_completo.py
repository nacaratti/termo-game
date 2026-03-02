"""
Gera o banco completo de palavras de 5 letras do português brasileiro
expandindo o dicionário Hunspell (pt_BR.aff + pt-br.dic).

O arquivo .aff contém as regras de sufixação/prefixação. Aplicando-as ao .dic
obtemos todas as formas válidas: plurais, conjugações, derivadas, etc.
"""

import re
from pathlib import Path
from collections import defaultdict

AFF = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\pt_BR.aff")
DIC = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\pt-br.dic")
OUT = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\palavras_5_letras.txt")

# Letras válidas em português
PT5 = re.compile(r'^[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ]{5}$')

# ─── 1. Parseia regras SFX/PFX do .aff ───────────────────────────────────────
# Formato: SFX flag strip add condition
# FLAG UTF-8 → cada caractere Unicode é uma flag independente

sfx = defaultdict(list)  # flag → [(strip, add, cond_re)]
pfx = defaultdict(list)

def make_cond(pattern, is_suffix):
    """Converte condição hunspell para regex."""
    if pattern == '.':
        return None  # sem condição
    try:
        if is_suffix:
            return re.compile('(?:' + pattern + ')$', re.IGNORECASE)
        else:
            return re.compile('^(?:' + pattern + ')', re.IGNORECASE)
    except re.error:
        return None  # ignora condições malformadas

with open(AFF, encoding='utf-8') as f:
    for line in f:
        parts = line.split()
        if len(parts) != 5 or parts[0] not in ('SFX', 'PFX'):
            continue

        directive, flag, strip, add, cond = parts

        # Ignora regras com add contendo '/' (flags encadeadas — não necessário aqui)
        # mas extrai a forma base antes do '/'
        add = add.split('/')[0]

        strip = '' if strip == '0' else strip
        add   = '' if add   == '0' else add

        cond_re = make_cond(cond, directive == 'SFX')

        if directive == 'SFX':
            sfx[flag].append((strip.upper(), add.upper(), cond_re))
        else:
            pfx[flag].append((strip.upper(), add.upper(), cond_re))

print(f"Regras SFX: {sum(len(v) for v in sfx.values()):,}  |  PFX: {sum(len(v) for v in pfx.values()):,}")

# ─── 2. Expande .dic aplicando as regras ─────────────────────────────────────
words = set()
skipped = 0

def apply_sfx(word, flag):
    for strip, add, cond_re in sfx.get(flag, []):
        if cond_re and not cond_re.search(word):
            continue
        if strip:
            if word.endswith(strip):
                new = word[:-len(strip)] + add
            else:
                continue
        else:
            new = word + add
        if len(new) == 5 and PT5.match(new):
            words.add(new)

def apply_pfx(word, flag):
    for strip, add, cond_re in pfx.get(flag, []):
        if cond_re and not cond_re.match(word):
            continue
        if strip:
            if word.startswith(strip):
                new = add + word[len(strip):]
            else:
                continue
        else:
            new = add + word
        if len(new) == 5 and PT5.match(new):
            words.add(new)

with open(DIC, encoding='utf-8') as f:
    next(f)  # pula contagem
    for raw in f:
        raw = raw.strip()
        if not raw:
            continue

        # "palavra/FLAGS" ou apenas "palavra"
        if '/' in raw:
            word_part, flags_str = raw.split('/', 1)
            flags_str = flags_str.split()[0]
        else:
            word_part = raw.split()[0]
            flags_str = ''

        word = word_part.strip().upper()

        # Ignora palavras com hífen, ponto, números, etc.
        if not word.isalpha():
            skipped += 1
            continue

        # Forma base de 5 letras
        if len(word) == 5 and PT5.match(word):
            words.add(word)

        # FLAG UTF-8 → cada caractere Unicode é uma flag separada
        for flag in flags_str:
            if flag in sfx:
                apply_sfx(word, flag)
            if flag in pfx:
                apply_pfx(word, flag)

# ─── 3. Salva resultado ───────────────────────────────────────────────────────
sorted_words = sorted(words)
OUT.write_text('\n'.join(sorted_words), encoding='utf-8')

print(f"Entradas ignoradas (compostos, etc.): {skipped:,}")
print(f"Total de palavras de 5 letras: {len(sorted_words):,}")
print(f"Arquivo salvo: {OUT}")
