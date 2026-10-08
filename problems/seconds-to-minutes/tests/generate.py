"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"seconds": s} for s in [0, 1, 9, 10, 59, 60, 61, 119, 600, 601, 3599, 86399, 1000000]]
tests += [{"seconds": rng.randint(0, 1000000)} for _ in range(10)]
print(json.dumps(tests))
