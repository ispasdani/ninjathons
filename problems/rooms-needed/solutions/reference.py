import heapq


def rooms_needed(meetings: list[list[int]]) -> int:
    ends: list[int] = []
    for start, end in sorted(meetings):
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)
        else:
            heapq.heappush(ends, end)
    return len(ends)
