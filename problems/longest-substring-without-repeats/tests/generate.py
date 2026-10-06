"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

import string

printable = string.ascii_letters + string.digits + string.punctuation + " "
n = 100000
tests = [
    {"s": ""},
    {"s": " "},
    {"s": "au"},
    {"s": "dvdf"},
    {"s": "abba"},
    {"s": "tmmzuxt"},
    {"s": printable * 3},
    {"s": "".join(rng.choice("ab") for _ in range(n))},
    {"s": "".join(rng.choice(printable) for _ in range(n))},
    {"s": "".join(rng.choice(string.ascii_lowercase[:20]) for _ in range(n))},
    {"s": "a" * (n - len(printable)) + printable},
]
print(json.dumps(tests))
