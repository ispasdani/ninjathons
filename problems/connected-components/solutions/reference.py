def count_components(n: int, edges: list[list[int]]) -> int:
    neighbours: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        neighbours[a].append(b)
        neighbours[b].append(a)
    seen = [False] * n
    groups = 0
    for start in range(n):
        if seen[start]:
            continue
        groups += 1
        seen[start] = True
        stack = [start]
        while stack:
            for nxt in neighbours[stack.pop()]:
                if not seen[nxt]:
                    seen[nxt] = True
                    stack.append(nxt)
    return groups
