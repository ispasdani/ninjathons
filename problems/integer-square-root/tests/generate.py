"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261012)

TOP = 2**53 - 1
K = 94906265  # the largest r with r * r <= TOP


def near_squares(count, low, high):
    xs = []
    for _ in range(count):
        r = rng.randint(low, high)
        xs.append(rng.choice([r * r, r * r - 1, r * r + 1]))
    return [x for x in xs if 0 <= x <= TOP]


tests = [
    {"xs": [0]},
    {"xs": [1, 2, 3, 4, 5]},
    {"xs": [TOP]},
    {"xs": [K * K, K * K - 1]},
    {"xs": [2**31 - 1, 2**32, 2**32 - 1, 10**15]},
    {"xs": [rng.randint(0, 10**6) for _ in range(100)]},
    # Just below a square, where a floating-point root rounds up.
    {"xs": [(K - i) * (K - i) - 1 for i in range(10000)]},
    {"xs": near_squares(10000, 10**7, K)},
    {"xs": [rng.randint(0, TOP) for _ in range(10000)]},
    # Every value large: too slow to count up to each root.
    {"xs": [TOP - rng.randint(0, 10**9) for _ in range(10000)]},
]
print(json.dumps(tests))
