"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261018)


def connected(n, m, high=10**4):
    # A random tree out of the source first, so everything is reachable.
    order = list(range(n))
    rng.shuffle(order)
    links = [[order[rng.randrange(i)], order[i], rng.randint(1, high)] for i in range(1, n)]
    while len(links) < m:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            links.append([a, b, rng.randint(1, high)])
    rng.shuffle(links)
    return {"n": n, "links": links, "source": order[0]}


def chain(n):
    # A path whose links are listed back to front: the worst order for
    # relaxing every link round after round.
    links = [[i, i + 1, rng.randint(1, 10**4)] for i in range(n - 1)]
    # Shortcuts that look good by link count but cost more.
    links += [[i, i + 2, 2 * 10**4] for i in range(0, n - 2, 3)]
    links.reverse()
    return {"n": n, "links": links, "source": 0}


n = 100000
tests = [
    {"n": 1, "links": [], "source": 0},
    {"n": 2, "links": [[0, 1, 7], [0, 1, 3]], "source": 0},
    {"n": 3, "links": [[0, 1, 1]], "source": 0},
    {"n": 3, "links": [[0, 1, 5], [1, 0, 1], [1, 2, 5]], "source": 1},
    connected(10, 20, high=10),
    connected(1000, 5000),
    connected(n, 2 * n),
    connected(n, n - 1),
    chain(n),
    # The largest time: a chain at the biggest delay.
    {"n": n, "links": [[i, i + 1, 10**4] for i in range(n - 1)], "source": 0},
    # Everything reachable but one server.
    {"n": n, "links": connected(n - 1, n)["links"], "source": 0},
]
print(json.dumps(tests))
