import heapq


def join_cost(ropes: list[int]) -> int:
    heap = list(ropes)
    heapq.heapify(heap)
    cost = 0
    while len(heap) > 1:
        tied = heapq.heappop(heap) + heapq.heappop(heap)
        cost += tied
        heapq.heappush(heap, tied)
    return cost
