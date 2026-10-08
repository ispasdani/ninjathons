from collections import deque
import string


def ladder_length(begin: str, end: str, words: list[str]) -> int:
    left = set(words)
    if end not in left:
        return 0
    left.discard(begin)
    queue = deque([(begin, 1)])
    while queue:
        w, length = queue.popleft()
        if w == end:
            return length
        for i in range(len(w)):
            for c in string.ascii_lowercase:
                v = w[:i] + c + w[i + 1:]
                if v in left:
                    left.remove(v)
                    queue.append((v, length + 1))
    return 0
