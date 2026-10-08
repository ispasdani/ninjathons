import heapq


def lowest_cost(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    best = [[float("inf")] * cols for _ in range(rows)]
    best[0][0] = grid[0][0]
    queue = [(grid[0][0], 0, 0)]
    while queue:
        cost, r, c = heapq.heappop(queue)
        if cost > best[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols:
                through = cost + grid[nr][nc]
                if through < best[nr][nc]:
                    best[nr][nc] = through
                    heapq.heappush(queue, (through, nr, nc))
    return best[-1][-1]
