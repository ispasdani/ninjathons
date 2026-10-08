def can_attend_all(meetings: list[list[int]]) -> bool:
    meetings = sorted(meetings)
    return all(meetings[i][0] >= meetings[i - 1][1] for i in range(1, len(meetings)))
