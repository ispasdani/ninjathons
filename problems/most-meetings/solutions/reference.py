def most_meetings(meetings: list[list[int]]) -> int:
    count = 0
    free = -1
    for start, end in sorted(meetings, key=lambda m: m[1]):
        if start >= free:
            count += 1
            free = end
    return count
