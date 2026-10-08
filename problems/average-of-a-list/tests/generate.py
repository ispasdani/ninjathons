"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": n} for n in [[], [7], [-7], [1, 2], [1, 1, 2], [10**9, 10**9], [-10**9, -10**9, -1], [0, 0, 0, 1]]]
tests += [{"nums": [rng.randint(-1000, 1000) for _ in range(rng.randint(1, 30))]} for _ in range(6)]
tests.append({"nums": [rng.randint(-10**9, 10**9) for _ in range(100000)]})
print(json.dumps(tests))
