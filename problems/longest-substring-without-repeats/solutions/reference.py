def length_of_longest_substring(s: str) -> int:
    window = set()
    left = best = 0
    for c in s:
        while c in window:
            window.remove(s[left])
            left += 1
        window.add(c)
        best = max(best, len(window))
    return best
