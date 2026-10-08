"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"stones": s} for s in [[1], [1, 1], [10**9, 1], [2, 2, 2], [9, 3, 3, 3], [1, 3, 5, 7, 9]]]
tests += [{"stones": [rng.randint(1, 50) for _ in range(rng.randint(1, 30))]} for _ in range(8)]
tests.append({"stones": [rng.randint(1, 10**9) for _ in range(100000)]})
tests.append({"stones": [rng.randint(1, 1000) for _ in range(100000)]})
print(json.dumps(tests))
