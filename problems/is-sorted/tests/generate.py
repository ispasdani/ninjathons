"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": n} for n in [[], [1], [1, 1], [2, 1], [1, 2, 3, 0], [0, 1, 2, 3, 2], [5, 4, 3], [-3, -3, -1], [1, 3, 2, 4], [4, 4, 4, 4]]]
for _ in range(4):
    xs = sorted(rng.randint(-10**9, 10**9) for _ in range(rng.randint(2, 40)))
    tests.append({"nums": xs})
    ys = list(xs)
    i = rng.randrange(len(ys) - 1)
    if ys[i] != ys[i + 1]:
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    tests.append({"nums": ys})
big = sorted(rng.randint(-10**8, 10**8) for _ in range(100000))
tests.append({"nums": big})
tests.append({"nums": big[:-1] + [big[-2] - 1]})
print(json.dumps(tests))
