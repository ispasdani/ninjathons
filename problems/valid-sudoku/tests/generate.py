"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

SOLVED = [
    "534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "345286179",
]
def blank(board, keep):
    return ["".join(ch if rng.random() < keep else "." for ch in row) for row in board]
def put(board, r, c, d):
    rows = [list(row) for row in board]
    rows[r][c] = d
    return ["".join(row) for row in rows]
tests = [{"board": SOLVED}, {"board": blank(SOLVED, 0.0)}]
for keep in (0.2, 0.5, 0.8):
    tests.append({"board": blank(SOLVED, keep)})
# Clashes in a row, a column and only a box (not sharing a row or column).
empty = ["........."] * 9
tests.append({"board": put(put(empty, 4, 1, "7"), 4, 8, "7")})
tests.append({"board": put(put(empty, 0, 6, "3"), 8, 6, "3")})
tests.append({"board": put(put(empty, 3, 3, "5"), 5, 5, "5")})
tests.append({"board": put(put(empty, 6, 0, "9"), 8, 2, "9")})
tests.append({"board": put(put(empty, 0, 0, "1"), 4, 4, "1")})
for _ in range(6):
    b = blank(SOLVED, 0.6)
    r, c = rng.randrange(9), rng.randrange(9)
    tests.append({"board": put(b, r, c, str(rng.randint(1, 9)))})
print(json.dumps(tests))
