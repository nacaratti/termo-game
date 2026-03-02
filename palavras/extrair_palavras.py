"""
Extrai todas as palavras de 5 letras do dicionário pt-br.dic (formato Hunspell).
Inclui palavras com e sem acentos / ç.
"""

import re
from pathlib import Path

INPUT  = Path(r"C:\Users\davin\OneDrive\termo_fake\pt-br.dic")
OUTPUT = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras_5_letras.txt")

# Letras válidas em português (a-z + acentos + ç)
PT_5 = re.compile(r"^[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ]{5}$")

words = set()

with open(INPUT, encoding="utf-8") as f:
    next(f)  # primeira linha = total de entradas, pular

    for raw in f:
        raw = raw.strip()
        if not raw:
            continue

        # Remove flags Hunspell: "palavra/XYZ" → "palavra"
        word = raw.split("/")[0].strip().upper()

        # Ignora compostos (hífen), abreviações (ponto), números, etc.
        if not word.isalpha():
            continue

        if PT_5.match(word):
            words.add(word)

sorted_words = sorted(words)
OUTPUT.write_text("\n".join(sorted_words), encoding="utf-8")

print(f"Total: {len(sorted_words):,} palavras → {OUTPUT.name}")
