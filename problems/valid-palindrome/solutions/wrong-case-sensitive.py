# Forgets to ignore upper and lower case.
def is_palindrome(s: str) -> bool:
    kept = [c for c in s if c.isalnum()]
    return kept == kept[::-1]
