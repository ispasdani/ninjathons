"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": n} for n in [[0], [-3], [5], [-2, -3], [-2, 0], [0, -2], [2, -5, -2, -4, 3], [-1, -1, -1], [1, -2, 1, -2, 1]]]
def safe(n, zero_rate, big_rate):
    out = []
    bigs = 0
    for _ in range(n):
        r = rng.random()
        if r < zero_rate:
            out.append(0)
            bigs = 0
        elif r < zero_rate + big_rate and bigs < 30:
            out.append(rng.choice([-2, 2]))
            bigs += 1
        else:
            out.append(rng.choice([-1, 1]))
    return out
for _ in range(6):
    tests.append({"nums": [rng.randint(-10, 10) for _ in range(rng.randint(1, 8))]})
for _ in range(4):
    tests.append({"nums": safe(rng.randint(10, 60), 0.05, 0.3)})
tests.append({"nums": safe(100000, 0.001, 0.0005)})
tests.append({"nums": safe(100000, 0.0, 0.0003)})
print(json.dumps(tests))
