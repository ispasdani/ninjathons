"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": n, "k": k} for n, k in [([1], 0), ([1], 1000000000), ([1, 2], 0), ([1, 2], 2), ([1, 2, 3], 4), ([1, 2, 3], 3)]]
for _ in range(8):
    n = rng.randint(1, 30)
    tests.append({"nums": [rng.randint(-100, 100) for _ in range(n)], "k": rng.randint(0, 100)})
big = [rng.randint(-10**9, 10**9) for _ in range(100000)]
tests.append({"nums": big, "k": 99999})
tests.append({"nums": big, "k": 10**9})
# The worst case at the largest size: a solution that moves one value per step
# (O(n × k)) must time out here with a clear margin, not just under the limit.
huge = [rng.randint(-10**9, 10**9) for _ in range(200000)]
tests.append({"nums": huge, "k": 199999})
print(json.dumps(tests))
