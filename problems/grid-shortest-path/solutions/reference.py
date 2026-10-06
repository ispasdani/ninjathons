import sys
from collections import deque

data = sys.stdin.read().split("\n")
rows, cols = map(int, data[0].split())
grid = data[1 : rows + 1]
start = end = None
for r, line in enumerate(grid):
    for c, ch in enumerate(line[:cols]):
        if ch == "S":
            start = (r, c)
        elif ch == "E":
            end = (r, c)
dist = {start: 0}
queue = deque([start])
while queue:
    r, c = queue.popleft()
    if (r, c) == end:
        break
    for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in dist:
            dist[(nr, nc)] = dist[(r, c)] + 1
            queue.append((nr, nc))
print(dist.get(end, -1))
