"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261019)


def shuffled(n, links):
    # Random server numbers and link order, so nothing depends on the layout.
    label = list(range(n))
    rng.shuffle(label)
    out = [[label[a], label[b]] if rng.random() < 0.5 else [label[b], label[a]] for a, b in links]
    rng.shuffle(out)
    return {"n": n, "links": out}


def cactus(n, cycle_chance):
    # A random tree; some extra links close cycles, a few are repeats.
    links = [[rng.randrange(i), i] for i in range(1, n)]
    for i in range(1, n):
        if rng.random() < cycle_chance:
            links.append([rng.randrange(i), i])
        if rng.random() < 0.01:
            links.append(list(links[i - 1]))
    return shuffled(n, links)


def path(n, repeats=0):
    links = [[i, i + 1] for i in range(n - 1)]
    for i in rng.sample(range(n - 1), repeats):
        links.append([i, i + 1])
    return shuffled(n, links)


def blobs(n, size):
    # Clumps closed into loops, joined in a line by single links.
    links = []
    for start in range(0, n, size):
        members = list(range(start, min(n, start + size)))
        for i in range(1, len(members)):
            links.append([members[i - 1], members[i]])
        if len(members) > 2:
            links.append([members[0], members[-1]])
        if start:
            links.append([start - 1, start])
    return shuffled(n, links)


n = 100000
tests = [
    {"n": 1, "links": []},
    {"n": 2, "links": [[0, 1]]},
    {"n": 2, "links": [[1, 0], [0, 1]]},
    {"n": 5, "links": [[0, 1], [2, 3]]},
    {"n": 6, "links": [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]]},
    cactus(30, 0.3),
    cactus(1000, 0.2),
    cactus(n, 0.5),
    # 100,000 servers in a line: every link critical, and a deep search.
    path(n),
    path(n, repeats=n // 2),
    blobs(n, 50),
    {"n": n, "links": cactus(n, 1.0)["links"] + [[0, n - 1]]},
]
print(json.dumps(tests))
