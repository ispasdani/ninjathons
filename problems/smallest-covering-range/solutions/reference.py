def smallest_range(lists: list[list[int]]) -> list[int]:
    # Every number tagged with its list, in order; then the shortest window
    # that holds every list, with two pointers.
    tagged = sorted((x, i) for i, lst in enumerate(lists) for x in lst)
    k = len(lists)
    count = [0] * k
    covered = 0
    best = None
    left = 0
    for right, (x, i) in enumerate(tagged):
        if count[i] == 0:
            covered += 1
        count[i] += 1
        while covered == k:
            a = tagged[left][0]
            if best is None or x - a < best[1] - best[0] or (x - a == best[1] - best[0] and a < best[0]):
                best = [a, x]
            j = tagged[left][1]
            count[j] -= 1
            if count[j] == 0:
                covered -= 1
            left += 1
    return best
