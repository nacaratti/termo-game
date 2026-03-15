"""
Separa o banco de palavras de 6 letras em duas listas:
  - solucoes_6.txt  → palavras comuns (para sortear como palavra do dia)
  - validas_6.txt   → todas as palavras (para aceitar como palpite)

Usa wordfreq para medir frequência de uso no português brasileiro.
"""

from pathlib import Path
from wordfreq import word_frequency
import unicodedata

BASE = Path(__file__).parent
SRC  = BASE / "palavras_6_letras.txt"
SOL  = BASE / "solucoes_6.txt"
VAL  = BASE / "validas_6.txt"

# Limiar ligeiramente menor que o de 5 letras pois palavras longas
# são naturalmente menos frequentes no corpus.
FREQ_THRESHOLD = 1e-6

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
    freq = word_frequency(normalize(word), 'pt')
    if freq >= FREQ_THRESHOLD:
        solucoes.append(word)
    validas.append(word)

solucoes.sort()
validas.sort()

SOL.write_text('\n'.join(solucoes), encoding='utf-8')
VAL.write_text('\n'.join(validas),  encoding='utf-8')

print(f"\nLista de solucoes  ({FREQ_THRESHOLD:.0e}): {len(solucoes):,} palavras  -> {SOL.name}")
print(f"Lista de validas             : {len(validas):,} palavras  -> {VAL.name}")
print("\nExemplos de soluções (primeiras 30):")
print(', '.join(solucoes[:30]))
