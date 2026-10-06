"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def random_grid(rows, cols, land):
    return {"grid": ["".join("1" if rng.random() < land else "0" for _ in range(cols)) for _ in range(rows)]}

def snake(size):
    # One long winding island: every other row is land, joined at alternating ends.
    rows = []
    for r in range(size):
        if r % 2 == 0:
            rows.append("1" * size)
        else:
            gap = ["0"] * size
            gap[-1 if r % 4 == 1 else 0] = "1"
            rows.append("".join(gap))
    return {"grid": rows}

tests = [
    {"grid": ["0"]},
    {"grid": ["1"]},
    {"grid": ["10", "01"]},
    {"grid": ["111", "101", "111"]},
    {"grid": ["1010101"]},
    {"grid": ["1", "0", "1", "1"]},
    random_grid(50, 80, 0.4),
    random_grid(300, 300, 0.5),
    random_grid(300, 300, 0.3),
    snake(300),
    {"grid": ["1" * 300] * 300},
    {"grid": ["".join("1" if (r + c) % 2 == 0 else "0" for c in range(300)) for r in range(300)]},
]
print(json.dumps(tests))
