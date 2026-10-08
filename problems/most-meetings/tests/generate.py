"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261021)


def case(n, span, longest):
    meetings = []
    for _ in range(n):
        start = rng.randint(0, span - 1)
        meetings.append([start, min(span, start + rng.randint(1, longest))])
    return {"meetings": meetings}


def decoys(n):
    # Long meetings that start first, each hiding several short ones.
    meetings = []
    for k in range(n // 4):
        base = k * 100
        meetings.append([base, base + 99])
        meetings += [[base + 1 + 30 * i, base + 30 * (i + 1)] for i in range(3)]
    rng.shuffle(meetings)
    return {"meetings": meetings}


n = 100000
tests = [
    {"meetings": [[0, 1]]},
    {"meetings": [[0, 5], [5, 10], [10, 15]]},
    {"meetings": [[0, 5], [0, 5], [0, 5]]},
    {"meetings": [[0, 10], [1, 2], [2, 3], [3, 4]]},
    {"meetings": [[0, 1000000000], [0, 1], [999999999, 1000000000]]},
    case(20, 50, 10),
    case(1000, 10**4, 100),
    case(n, 10**9, 10**5),
    case(n, 10**6, 1000),
    decoys(n),
    # Everything overlapping one moment: only one fits.
    {"meetings": [[rng.randint(0, 10**6), rng.randint(10**6 + 1, 10**9)] for _ in range(n)]},
]
print(json.dumps(tests))
