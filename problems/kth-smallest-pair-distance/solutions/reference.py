def kth_smallest_distance(nums: list[int], k: int) -> int:
    nums = sorted(nums)
    n = len(nums)

    def pairs_within(d: int) -> int:
        count = left = 0
        for right in range(n):
            while nums[right] - nums[left] > d:
                left += 1
            count += right - left
        return count

    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = (lo + hi) // 2
        if pairs_within(mid) >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo
