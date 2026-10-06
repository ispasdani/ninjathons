def max_sliding_window(nums: list[int], k: int) -> list[int]:
    # Block maxima: split into blocks of k; each window spans the end of one block
    # and the start of the next.
    n = len(nums)
    left = nums[:]
    right = nums[:]
    for i in range(1, n):
        if i % k:
            left[i] = max(left[i - 1], nums[i])
    for i in range(n - 2, -1, -1):
        if (i + 1) % k:
            right[i] = max(right[i + 1], nums[i])
    return [max(right[i], left[i + k - 1]) for i in range(n - k + 1)]
