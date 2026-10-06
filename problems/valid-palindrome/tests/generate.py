"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

import string

def palindrome(n):
    half = "".join(rng.choice(string.ascii_letters + string.digits + " ,.!") for _ in range(n // 2))
    return half + half[::-1].swapcase()

tests = [
    {"s": "a"},
    {"s": "ab"},
    {"s": "Aa"},
    {"s": "0P"},
    {"s": "...!!!"},
    {"s": "No 'x' in Nixon"},
    {"s": "Was it a car or a cat I saw?"},
    {"s": "12321"},
    {"s": "1a2"},
    {"s": palindrome(200000)},
    {"s": palindrome(199998)[:-1] + "#"},
    {"s": "ab" * 100000},
]
print(json.dumps(tests))
