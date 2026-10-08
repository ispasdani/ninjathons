"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": [0]}, {"nums": [-1]}, {"nums": [-10**9]}, {"nums": [5, 5, 5]}, {"nums": [1, 2, 3, 4]}, {"nums": [4, 3, 2, 1]}, {"nums": [-7, -3, -9]}]
tests += [{"nums": [rng.randint(-10**9, -1) for _ in range(rng.randint(1, 40))]} for _ in range(4)]
tests += [{"nums": [rng.randint(-10**9, 10**9) for _ in range(rng.randint(1, 40))]} for _ in range(4)]
tests.append({"nums": [rng.randint(-10**9, 10**9) for _ in range(100000)]})
print(json.dumps(tests))
