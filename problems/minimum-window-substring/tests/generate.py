"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
tests = [{"s": s, "t": t} for s, t in [("a", "a"), ("a", "b"), ("ab", "b"), ("ab", "ba"), ("aa", "aa"), ("abcabc", "cba"), ("aAbB", "AB"), ("bba", "ab"), ("xyzxyz", "zz")]]
letters = string.ascii_letters
for _ in range(6):
    s = "".join(rng.choice("abcd") for _ in range(rng.randint(1, 40)))
    t = "".join(rng.choice("abcd") for _ in range(rng.randint(1, 5)))
    tests.append({"s": s, "t": t})
s = "".join(rng.choice(letters) for _ in range(100000))
tests.append({"s": s, "t": "".join(rng.choice(letters) for _ in range(60))})
s = "".join(rng.choice("ab") for _ in range(100000)) + "c"
tests.append({"s": s, "t": "abc"})
tests.append({"s": "a" * 100000, "t": "a" * 50000})
print(json.dumps(tests))
