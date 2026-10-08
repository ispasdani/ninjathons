def critical_links(n: int, links: list[list[int]]) -> list[list[int]]:
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for i, (a, b) in enumerate(links):
        adj[a].append((b, i))
        adj[b].append((a, i))
    time = [-1] * n
    low = [0] * n
    clock = 0
    result = []
    for root in range(n):
        if time[root] != -1:
            continue
        time[root] = low[root] = clock
        clock += 1
        # [server, id of the link it was reached by, position in its adjacency list]
        stack = [[root, -1, 0]]
        while stack:
            frame = stack[-1]
            u, via, pos = frame
            if pos < len(adj[u]):
                frame[2] += 1
                v, link = adj[u][pos]
                if link == via:
                    continue
                if time[v] == -1:
                    time[v] = low[v] = clock
                    clock += 1
                    stack.append([v, link, 0])
                elif time[v] < low[u]:
                    low[u] = time[v]
            else:
                stack.pop()
                if stack:
                    parent = stack[-1][0]
                    low[parent] = min(low[parent], low[u])
                    if low[u] > time[parent]:
                        result.append([min(parent, u), max(parent, u)])
    return result
