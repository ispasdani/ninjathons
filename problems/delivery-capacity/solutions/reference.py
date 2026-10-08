def min_capacity(weights: list[int], days: int) -> int:
    def days_needed(capacity: int) -> int:
        count, load = 1, 0
        for w in weights:
            if load + w > capacity:
                count += 1
                load = 0
            load += w
        return count

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo
