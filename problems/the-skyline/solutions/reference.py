import heapq


def skyline(buildings: list[list[int]]) -> list[list[int]]:
    by_left = sorted(buildings)
    xs = sorted({x for left, right, _ in buildings for x in (left, right)})
    heap: list[tuple[int, int]] = []  # (-height, right)
    result = []
    last = 0
    i = 0
    for x in xs:
        while i < len(by_left) and by_left[i][0] <= x:
            heapq.heappush(heap, (-by_left[i][2], by_left[i][1]))
            i += 1
        while heap and heap[0][1] <= x:
            heapq.heappop(heap)
        h = -heap[0][0] if heap else 0
        if h != last:
            result.append([x, h])
            last = h
    return result
