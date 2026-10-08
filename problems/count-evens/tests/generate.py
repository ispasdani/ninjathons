"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": []}, {"nums": [2]}, {"nums": [3]}, {"nums": [-3]}, {"nums": [-2, -1, 0, 1, 2]}, {"nums": [7, 2, 2, 2]}, {"nums": [-5, -3, -1]}]
tests += [{"nums": [rng.randint(-10**9, 10**9) for _ in range(rng.randint(1, 50))]} for _ in range(8)]
tests.append({"nums": [rng.randint(-10**9, 10**9) for _ in range(100000)]})
print(json.dumps(tests))
