"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"year": y} for y in [1, 4, 100, 200, 300, 400, 1600, 1700, 1996, 1999, 2023, 2100, 2400, 99996, 100000]]
tests += [{"year": rng.randint(1, 100000)} for _ in range(10)]
print(json.dumps(tests))
