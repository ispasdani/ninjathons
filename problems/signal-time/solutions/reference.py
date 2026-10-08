import heapq


def signal_time(n: int, links: list[list[int]], source: int) -> int:
    out: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for a, b, ms in links:
        out[a].append((b, ms))
    inf = float("inf")
    time = [inf] * n
    time[source] = 0
    heap = [(0, source)]
    while heap:
        t, u = heapq.heappop(heap)
        if t > time[u]:
            continue
        for v, ms in out[u]:
            if t + ms < time[v]:
                time[v] = t + ms
                heapq.heappush(heap, (t + ms, v))
    worst = max(time)
    return -1 if worst == inf else int(worst)
