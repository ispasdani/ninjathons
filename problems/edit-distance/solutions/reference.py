def min_distance(word1: str, word2: str) -> int:
    prev = list(range(len(word2) + 1))
    for i, a in enumerate(word1, 1):
        cur = [i]
        for j, b in enumerate(word2, 1):
            cur.append(prev[j - 1] if a == b else 1 + min(prev[j - 1], prev[j], cur[j - 1]))
        prev = cur
    return prev[-1]
