"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261023)


def case(n, span, widest, tallest):
    buildings = []
    for _ in range(n):
        left = rng.randint(0, span - 1)
        right = min(span, left + rng.randint(1, widest))
        buildings.append([left, right, rng.randint(1, tallest)])
    return {"buildings": buildings}


def terraces(n):
    # Buildings side by side, many the same height as their neighbour.
    buildings = []
    x = 0
    h = 5
    for _ in range(n):
        width = rng.randint(1, 10)
        if rng.random() < 0.3:
            h = rng.randint(1, 10)
        buildings.append([x, x + width, h])
        x += width
    rng.shuffle(buildings)
    return {"buildings": buildings}


n = 100000
tests = [
    {"buildings": [[0, 1, 1]]},
    {"buildings": [[0, 10, 5], [0, 10, 5]]},
    {"buildings": [[0, 10, 5], [2, 4, 3]]},
    {"buildings": [[0, 5, 3], [5, 10, 7]]},
    {"buildings": [[0, 5, 7], [5, 10, 3]]},
    {"buildings": [[0, 3, 4], [1, 3, 6], [3, 5, 2]]},
    {"buildings": [[0, 1000000000, 1000000000]]},
    case(20, 40, 10, 10),
    case(1000, 10**4, 300, 1000),
    case(n, 10**9, 10**7, 10**9),
    case(n, 10**5, 50, 100),
    terraces(n),
    # Nested towers: each one narrower and taller, all ending at different places.
    {"buildings": [[i, 2 * n - i, i + 1] for i in range(n)]},
    # One tall wide building over many small ones: a flat skyline.
    {"buildings": [[0, 10**9, 10**9]] + case(n - 1, 10**9, 10**6, 10**8)["buildings"]},
]
print(json.dumps(tests))
