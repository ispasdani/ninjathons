MOD = 1_000_000_007


def count_paths(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0])
    ways = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "#":
                continue
            if r == 0 and c == 0:
                ways[r][c] = 1
                continue
            above = ways[r - 1][c] if r > 0 else 0
            left = ways[r][c - 1] if c > 0 else 0
            ways[r][c] = (above + left) % MOD
    return ways[-1][-1]
