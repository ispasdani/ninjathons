# Compares which letters appear, not how many times.
def is_anagram(s: str, t: str) -> bool:
    return set(s) == set(t)
