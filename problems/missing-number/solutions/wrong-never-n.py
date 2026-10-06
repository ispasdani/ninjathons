# Looks for a gap below n only, so it misses the case where n itself is missing.
def missing_number(nums: list[int]) -> int:
    present = set(nums)
    for x in range(len(nums)):
        if x not in present:
            return x
    return 0
