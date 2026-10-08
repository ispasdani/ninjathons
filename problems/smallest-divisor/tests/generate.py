"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [
    {"nums": [1], "threshold": 1}, {"nums": [10**6], "threshold": 1}, {"nums": [10**6], "threshold": 10**6},
    {"nums": [2, 3, 5, 7, 11], "threshold": 11}, {"nums": [19], "threshold": 5}, {"nums": [1, 1, 1], "threshold": 3},
]
for _ in range(6):
    n = rng.randint(1, 30)
    nums = [rng.randint(1, 1000) for _ in range(n)]
    tests.append({"nums": nums, "threshold": rng.randint(n, sum(nums))})
n = 50000
tests.append({"nums": [rng.randint(1, 10**6) for _ in range(n)], "threshold": n})
tests.append({"nums": [rng.randint(1, 10**6) for _ in range(n)], "threshold": rng.randint(n, 10**6)})
print(json.dumps(tests))
