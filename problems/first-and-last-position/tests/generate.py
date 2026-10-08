"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [
    {"nums": [1], "target": 1}, {"nums": [1], "target": 2}, {"nums": [2, 2], "target": 2},
    {"nums": [1, 2, 3], "target": 1}, {"nums": [1, 2, 3], "target": 3}, {"nums": [1, 1, 1, 2], "target": 1},
    {"nums": [1, 2, 2, 2], "target": 2}, {"nums": [-5, -5, 0, 0, 9], "target": 0}, {"nums": [1, 3], "target": 2},
]
for _ in range(6):
    xs = sorted(rng.randint(-20, 20) for _ in range(rng.randint(1, 40)))
    tests.append({"nums": xs, "target": rng.randint(-22, 22)})
big = sorted(rng.randint(-10**9, 10**9) for _ in range(100000))
tests.append({"nums": big, "target": big[50000]})
tests.append({"nums": [7] * 100000, "target": 7})
print(json.dumps(tests))
