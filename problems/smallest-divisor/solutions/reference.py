def smallest_divisor(nums: list[int], threshold: int) -> int:
    lo, hi = 1, max(nums)
    while lo < hi:
        d = (lo + hi) // 2
        if sum((x + d - 1) // d for x in nums) <= threshold:
            hi = d
        else:
            lo = d + 1
    return lo
