"""
Separa o banco de palavras de 5 letras em duas listas:
  - solucoes.txt   → palavras comuns (para sortear como palavra do dia)
  - validas.txt    → todas as palavras (para aceitar como palpite)

Usa wordfreq para medir frequência de uso no português brasileiro.
"""

from pathlib import Path
from wordfreq import word_frequency
import unicodedata

SRC  = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\palavras_5_letras.txt")
SOL  = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\solucoes.txt")
VAL  = Path(r"C:\Users\davin\OneDrive\termo_fake\palavras\validas.txt")

# Limiar de frequência para entrar na lista de soluções.
# wordfreq retorna valores entre 0 e 1 (fração de uso no corpus).
# 3e-6 ≈ palavras usadas ~3 vezes por milhão → seleciona ~2.000–3.000 palavras.
FREQ_THRESHOLD = 3e-6

def normalize(word):
    """Remove acentos e cedilha para consulta no wordfreq."""
    nfd = unicodedata.normalize('NFD', word.lower())
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

words = SRC.read_text(encoding='utf-8').splitlines()
words = [w.strip() for w in words if w.strip()]

print(f"Total de palavras no banco: {len(words):,}")
print("Calculando frequências... (pode demorar alguns segundos)")

solucoes = []
validas  = []

for word in words:
    # Consulta wordfreq com a forma sem acento (língua pt)
    freq = word_frequency(normalize(word), 'pt')
    if freq >= FREQ_THRESHOLD:
        solucoes.append(word)
    validas.append(word)   # todas vão para validas

# Ordena alfabeticamente
solucoes.sort()
validas.sort()

SOL.write_text('\n'.join(solucoes), encoding='utf-8')
VAL.write_text('\n'.join(validas),  encoding='utf-8')

print(f"\nLista de soluções  ({FREQ_THRESHOLD:.0e}): {len(solucoes):,} palavras  → {SOL.name}")
print(f"Lista de válidas             : {len(validas):,} palavras  → {VAL.name}")
print("\nExemplos de soluções (primeiras 30):")
print(', '.join(solucoes[:30]))
