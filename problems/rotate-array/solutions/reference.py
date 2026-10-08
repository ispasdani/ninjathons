def rotate(nums: list[int], k: int) -> list[int]:
    k %= len(nums)
    return nums[-k:] + nums[:-k] if k else list(nums)
