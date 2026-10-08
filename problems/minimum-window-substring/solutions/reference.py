from collections import Counter


def min_window(s: str, t: str) -> str:
    need = Counter(t)
    missing = len(t)
    best = (float("inf"), 0)
    left = 0
    for right, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        while missing == 0:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left)
            d = s[left]
            need[d] += 1
            if need[d] > 0:
                missing += 1
            left += 1
    return "" if best[0] == float("inf") else s[best[1]:best[1] + best[0]]
