def majority_element(nums: list[int]) -> int:
    return sorted(nums)[len(nums) // 2]
