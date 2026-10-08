"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
tests = [{"words": w} for w in [["a"], ["a", "b"], ["ab", "ba"], ["aab", "abb", "bab", "aba"], ["", "", "a"], ["abc", "cab", "bca", "xyz"]]]
def shuffled(word):
    letters = list(word)
    rng.shuffle(letters)
    return "".join(letters)
for _ in range(6):
    roots = ["".join(rng.choice("abcde") for _ in range(rng.randint(0, 6))) for _ in range(rng.randint(1, 5))]
    tests.append({"words": [shuffled(rng.choice(roots)) for _ in range(rng.randint(1, 15))]})
roots = ["".join(rng.choice(string.ascii_lowercase) for _ in range(rng.randint(1, 100))) for _ in range(800)]
tests.append({"words": [shuffled(rng.choice(roots)) for _ in range(10000)]})
print(json.dumps(tests))
