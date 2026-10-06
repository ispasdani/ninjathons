def is_palindrome(s: str) -> bool:
    kept = [c.lower() for c in s if c.isascii() and c.isalnum()]
    return kept == kept[::-1]
