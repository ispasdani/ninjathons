"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
tests = [{"s": s} for s in ["a", "aa", "ab", "ba", "abab", "abcabcd", "zzzzy", "yzzzz", "abcdefghijklmnopqrstuvwxyz" * 2]]
tests += [{"s": "".join(rng.choice("abc") for _ in range(rng.randint(1, 20)))} for _ in range(6)]
big = [rng.choice(string.ascii_lowercase[:25]) for _ in range(99999)]
big.append("z")
tests.append({"s": "".join(big)})
tests.append({"s": "".join(rng.choice(string.ascii_lowercase) for _ in range(100000))})
print(json.dumps(tests))
