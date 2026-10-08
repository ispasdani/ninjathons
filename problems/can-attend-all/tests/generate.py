"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261020)


def back_to_back(n, touching=True, clash=False):
    # A day of meetings one after another, shuffled; optionally one clash.
    meetings = []
    t = 0
    for _ in range(n):
        start = t if touching else t + rng.randint(0, 5)
        end = start + rng.randint(1, 1000)
        meetings.append([start, end])
        t = end
    if clash:
        i = rng.randrange(1, n)
        meetings[i][0] -= 1
    rng.shuffle(meetings)
    return {"meetings": meetings}


n = 100000
tests = [
    {"meetings": [[0, 1]]},
    {"meetings": [[0, 10], [10, 20], [20, 30]]},
    {"meetings": [[0, 10], [9, 20]]},
    {"meetings": [[5, 6], [0, 100]]},
    {"meetings": [[3, 4], [3, 4]]},
    {"meetings": [[0, 1000000000], [999999999, 1000000000]]},
    back_to_back(20),
    back_to_back(1000, touching=False),
    # Every meeting touching the next: fine.
    back_to_back(n),
    # The same, with one meeting starting a minute early.
    back_to_back(n, clash=True),
    back_to_back(n, touching=False),
    back_to_back(n, touching=False, clash=True),
]
print(json.dumps(tests))
