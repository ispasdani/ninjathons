def is_sorted(nums: list[int]) -> bool:
    return all(nums[i] >= nums[i - 1] for i in range(1, len(nums)))
