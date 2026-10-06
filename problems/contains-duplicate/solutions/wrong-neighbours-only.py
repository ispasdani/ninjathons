# Only compares neighbours, without sorting first.
def contains_duplicate(nums: list[int]) -> bool:
    return any(nums[i] == nums[i + 1] for i in range(len(nums) - 1))
