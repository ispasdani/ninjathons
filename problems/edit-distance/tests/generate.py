"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

import string

def word(n, letters=string.ascii_lowercase):
    return "".join(rng.choice(letters) for _ in range(n))

def mutate(w, edits):
    w = list(w)
    for _ in range(edits):
        op = rng.choice("idr")
        i = rng.randrange(len(w) + 1)
        if op == "i" or not w:
            w.insert(i, rng.choice(string.ascii_lowercase))
        elif op == "d":
            del w[min(i, len(w) - 1)]
        else:
            w[min(i, len(w) - 1)] = rng.choice(string.ascii_lowercase)
    return "".join(w)

base = word(1000)
tests = [
    {"word1": "", "word2": ""},
    {"word1": "a", "word2": ""},
    {"word1": "same", "word2": "same"},
    {"word1": "abc", "word2": "cba"},
    {"word1": "kitten", "word2": "sitting"},
    {"word1": word(30, "ab"), "word2": word(30, "ab")},
    {"word1": base, "word2": mutate(base, 50)},
    {"word1": word(1000), "word2": word(1000)},
    {"word1": word(1000, "ab"), "word2": word(999, "ab")},
    {"word1": "a" * 1000, "word2": "b" * 1000},
    {"word1": word(1000), "word2": ""},
]
print(json.dumps(tests))
