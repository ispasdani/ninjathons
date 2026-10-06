"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def balanced(n):
    pairs = {"(": ")", "[": "]", "{": "}"}
    out, stack = [], []
    while len(out) + len(stack) < n:
        if stack and (rng.random() < 0.5 or len(out) + 2 * len(stack) >= n):
            out.append(pairs[stack.pop()])
        else:
            c = rng.choice("([{")
            stack.append(c)
            out.append(c)
    out.extend(pairs[c] for c in reversed(stack))
    return "".join(out)

deep = "(" * 50000 + ")" * 50000
tests = [
    {"s": "("},
    {"s": ")"},
    {"s": "]["},
    {"s": "{[]}"},
    {"s": "(("},
    {"s": "())"},
    {"s": "{[()()]}[]"},
    {"s": balanced(100000)},
    {"s": deep},
    {"s": deep[:-1] + "]"},
    {"s": balanced(99998) + ")("},
]
print(json.dumps(tests))
