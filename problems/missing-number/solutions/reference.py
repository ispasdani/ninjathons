def missing_number(nums: list[int]) -> int:
    missing = len(nums)
    for i, x in enumerate(nums):
        missing ^= i ^ x
    return missing
