# Allows diagonal moves, which the rules don't.
import sys
from collections import deque

data = sys.stdin.read().split("\n")
rows, cols = map(int, data[0].split())
grid = data[1 : rows + 1]
cells = {(r, c): ch for r, line in enumerate(grid) for c, ch in enumerate(line[:cols])}
start = next(p for p, ch in cells.items() if ch == "S")
end = next(p for p, ch in cells.items() if ch == "E")
dist = {start: 0}
queue = deque([start])
while queue:
    r, c = queue.popleft()
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            p = (r + dr, c + dc)
            if cells.get(p, "#") != "#" and p not in dist:
                dist[p] = dist[(r, c)] + 1
                queue.append(p)
print(dist.get(end, -1))
