# Moves the zeros by sorting, which also reorders everything else.
def move_zeroes(nums: list[int]) -> list[int]:
    return sorted(nums, key=lambda x: (x == 0, x))
