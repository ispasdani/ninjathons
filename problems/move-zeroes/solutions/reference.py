def move_zeroes(nums: list[int]) -> list[int]:
    kept = [x for x in nums if x != 0]
    return kept + [0] * (len(nums) - len(kept))
