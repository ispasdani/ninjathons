"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
def sentence(words, max_gap):
    parts = [" " * rng.randint(0, max_gap)]
    for w in words:
        parts.append(w)
        parts.append(" " * rng.randint(1, max_gap))
    return "".join(parts)
def word():
    return "".join(rng.choice(string.ascii_letters + string.digits) for _ in range(rng.randint(1, 8)))
tests = [{"s": s} for s in ["a", " a", "a ", "a b", "  a  b  ", "Hello World", "x y z w"]]
tests += [{"s": sentence([word() for _ in range(rng.randint(1, 12))], 3)} for _ in range(8)]
tests.append({"s": sentence([word() for _ in range(15000)], 2)})
print(json.dumps(tests))
