from collections import deque

def num_islands(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0])
    seen = [[False] * cols for _ in range(rows)]
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or seen[r][c]:
                continue
            islands += 1
            seen[r][c] = True
            queue = deque([(r, c)])
            while queue:
                y, x = queue.popleft()
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == "1" and not seen[ny][nx]:
                        seen[ny][nx] = True
                        queue.append((ny, nx))
    return islands
