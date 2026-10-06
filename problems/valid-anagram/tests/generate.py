"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

import string

def word(n):
    return "".join(rng.choice(string.ascii_lowercase) for _ in range(n))

def shuffled(w):
    letters = list(w)
    rng.shuffle(letters)
    return "".join(letters)

big = word(100000)
tests = [
    {"s": "a", "t": "a"},
    {"s": "a", "t": "b"},
    {"s": "ab", "t": "a"},
    {"s": "aab", "t": "abb"},
    {"s": "listen", "t": "silent"},
    {"s": "abc", "t": "abcd"},
    {"s": "z" * 1000, "t": "z" * 999 + "y"},
    {"s": big, "t": shuffled(big)},
    {"s": big, "t": shuffled(big[:-1] + ("a" if big[-1] != "a" else "b"))},
    {"s": word(99999), "t": word(100000)},
]
print(json.dumps(tests))
