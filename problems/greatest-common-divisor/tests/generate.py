"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"a": a, "b": b} for a, b in [(1, 1), (0, 1), (5, 0), (2147483647, 2147483647), (2147483647, 1), (2147483646, 1073741823), (1836311903, 1134903170), (1000000007, 998244353), (360, 840), (2**30, 2**20)]]
tests += [{"a": rng.randint(0, 2**31 - 1), "b": rng.randint(0, 2**31 - 1)} for _ in range(10)]
g = rng.randint(1, 50000)
tests.append({"a": g * rng.randint(1, 40000), "b": g * rng.randint(1, 40000)})
print(json.dumps(tests))
