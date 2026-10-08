"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261026)


def case(k, total, low, high):
    sizes = [1] * k
    for _ in range(total - k):
        sizes[rng.randrange(k)] += 1
    return {"lists": [sorted(rng.randint(low, high) for _ in range(s)) for s in sizes]}


def evenly_spaced(k, per_list, step):
    # List i holds i, i + step, i + 2 step, ...: every window of k values is
    # the same width, so only the tie rule decides.
    return {"lists": [[i + j * step for j in range(per_list)] for i in range(k)]}


tests = [
    {"lists": [[5]]},
    {"lists": [[1, 2, 3, 4]]},
    {"lists": [[1], [1000000000]]},
    {"lists": [[-1000000000], [1000000000]]},
    {"lists": [[1, 10], [2, 11], [3, 12]]},
    {"lists": [[0, 0, 0], [0, 0]]},
    case(5, 30, 0, 100),
    case(50, 1000, -10**6, 10**6),
    case(1000, 100000, -10**9, 10**9),
    # Many short lists: scanning every list for the smallest is too slow.
    case(10000, 100000, -10**9, 10**9),
    case(10000, 100000, 0, 10**6),
    case(2, 100000, -10**9, 10**9),
    case(100, 100000, 0, 10**5),
    evenly_spaced(10000, 10, 10000),
    # One list far from the others: the range must stretch to it.
    {"lists": case(99, 99000, 0, 10**6)["lists"] + [[10**9 - 5, 10**9]]},
]
print(json.dumps(tests))
