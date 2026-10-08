def fewest_terms(n: int, prerequisites: list[list[int]]) -> int:
    following: list[list[int]] = [[] for _ in range(n)]
    waiting = [0] * n
    for before, after in prerequisites:
        following[before].append(after)
        waiting[after] += 1
    term = [i for i in range(n) if waiting[i] == 0]
    terms = taken = 0
    while term:
        terms += 1
        taken += len(term)
        ready = []
        for course in term:
            for after in following[course]:
                waiting[after] -= 1
                if waiting[after] == 0:
                    ready.append(after)
        term = ready
    return terms if taken == n else -1
