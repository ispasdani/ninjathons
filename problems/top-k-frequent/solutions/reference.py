from collections import Counter


def top_k_frequent(nums: list[int], k: int) -> list[int]:
    count = Counter(nums)
    return sorted(count, key=lambda x: (-count[x], x))[:k]
