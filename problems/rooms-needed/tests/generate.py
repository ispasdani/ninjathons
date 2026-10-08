"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261022)


def case(n, span, longest):
    meetings = []
    for _ in range(n):
        start = rng.randint(0, span - 1)
        meetings.append([start, min(span, start + rng.randint(1, longest))])
    return {"meetings": meetings}


def relay(n, rooms):
    # `rooms` rooms booked back to back all day: touching ends and starts
    # everywhere, so counting a touch as a clash needs extra rooms.
    meetings = []
    for _ in range(rooms):
        t = 0
        for _ in range(n // rooms):
            end = t + rng.randint(1, 50)
            meetings.append([t, end])
            t = end
    rng.shuffle(meetings)
    return {"meetings": meetings}


n = 100000
tests = [
    {"meetings": [[0, 1]]},
    {"meetings": [[0, 10], [0, 10], [0, 10]]},
    {"meetings": [[0, 10], [10, 20], [5, 15]]},
    {"meetings": [[1, 2], [2, 3], [3, 4], [1, 4]]},
    case(20, 50, 20),
    case(1000, 10**4, 500),
    case(n, 10**9, 10**4),
    case(n, 10**6, 10**4),
    relay(n, 7),
    # Everything overlapping one moment.
    {"meetings": [[rng.randint(0, 10**6), rng.randint(10**6 + 1, 10**9)] for _ in range(n)]},
    # Nested: each one inside the last.
    {"meetings": [[i, 2 * n - i] for i in range(n)]},
]
print(json.dumps(tests))
