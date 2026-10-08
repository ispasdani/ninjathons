"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261010)


def case(n, b, seats=10000, long_ranges=False):
    bookings = []
    for _ in range(b):
        if long_ranges:
            first, last = 1 + rng.randrange(10), n - rng.randrange(10)
        else:
            first = rng.randint(1, n)
            last = rng.randint(first, n)
        bookings.append([first, last, rng.randint(1, seats)])
    return {"bookings": bookings, "n": n}


n = 100000
tests = [
    {"bookings": [[1, 1, 1]], "n": 1},
    {"bookings": [[1, 1, 7]], "n": 3},
    {"bookings": [[3, 3, 7]], "n": 3},
    {"bookings": [[1, 3, 2], [1, 3, 3]], "n": 3},
    # A booking that ends on the last flight.
    {"bookings": [[2, 4, 5], [4, 4, 1]], "n": 4},
    case(10, 10, seats=20),
    case(1000, 1000),
    case(n, n),
    # Long bookings, the worst case for filling each flight.
    case(n, n, long_ranges=True),
    # The largest totals: every booking covers everything with the most seats.
    {"bookings": [[1, n, 10000]] * n, "n": n},
]
print(json.dumps(tests))
