"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"celsius": c} for c in [0, 1, -1, 37, 36.6, -273.15, 1000, -1000, 0.5, 21.3]]
tests += [{"celsius": round(rng.uniform(-1000, 1000), 3)} for _ in range(10)]
print(json.dumps(tests))
