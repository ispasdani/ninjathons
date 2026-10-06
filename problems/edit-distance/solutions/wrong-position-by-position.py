# Compares position by position, as if insertions and deletions couldn't shift letters.
def min_distance(word1: str, word2: str) -> int:
    differ = sum(1 for a, b in zip(word1, word2) if a != b)
    return differ + abs(len(word1) - len(word2))
