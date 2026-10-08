import heapq


def running_medians(nums: list[int]) -> list[int]:
    lower: list[int] = []  # max-heap, stored negated
    upper: list[int] = []  # min-heap
    medians = []
    for x in nums:
        if not lower or x <= -lower[0]:
            heapq.heappush(lower, -x)
        else:
            heapq.heappush(upper, x)
        if len(lower) > len(upper) + 1:
            heapq.heappush(upper, -heapq.heappop(lower))
        elif len(upper) > len(lower):
            heapq.heappush(lower, -heapq.heappop(upper))
        medians.append(-lower[0])
    return medians
