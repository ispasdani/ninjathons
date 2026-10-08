def min_reading_speed(pages: list[int], hours: int) -> int:
    def fits(k: int) -> bool:
        return sum((p + k - 1) // k for p in pages) <= hours

    lo, hi = 1, max(pages)
    while lo < hi:
        mid = (lo + hi) // 2
        if fits(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
