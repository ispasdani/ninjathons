"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": [0]}, {"nums": [5]}, {"nums": [0, 0]}, {"nums": [0, 1]}, {"nums": [1, 0]}, {"nums": [3, 3, 1]}, {"nums": [1, 3, 3]}, {"nums": [10**9, 10**9, 0]}, {"nums": [2, 1, 2, 1]}]
tests += [{"nums": [rng.randint(0, 20) for _ in range(rng.randint(1, 30))]} for _ in range(6)]
tests.append({"nums": [rng.randint(0, 10**9) for _ in range(100000)]})
big = [10**9] * 50000 + [10**9 - 1]
rng.shuffle(big)
tests.append({"nums": big})
print(json.dumps(tests))
