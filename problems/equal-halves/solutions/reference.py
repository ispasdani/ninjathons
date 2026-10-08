def can_split(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False
    # Bit s is set when some of the items add up to s.
    reachable = 1
    for x in nums:
        reachable |= reachable << x
    return bool(reachable >> (total // 2) & 1)
