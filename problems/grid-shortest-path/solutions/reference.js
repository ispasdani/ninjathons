const lines = require("fs").readFileSync(0, "utf8").split("\n");
const [R, C] = lines[0].trim().split(/\s+/).map(Number);
const grid = lines.slice(1, R + 1);
const dist = new Int32Array(R * C).fill(-1);
const queue = new Int32Array(R * C);
let head = 0;
let tail = 0;
let end = -1;
for (let r = 0; r < R; r++)
  for (let c = 0; c < C; c++) {
    if (grid[r][c] === "S") { dist[r * C + c] = 0; queue[tail++] = r * C + c; }
    if (grid[r][c] === "E") end = r * C + c;
  }
while (head < tail) {
  const cell = queue[head++];
  if (cell === end) break;
  const r = Math.floor(cell / C);
  const c = cell % C;
  for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] === "#") continue;
    const k = nr * C + nc;
    if (dist[k] === -1) { dist[k] = dist[cell] + 1; queue[tail++] = k; }
  }
}
console.log(dist[end]);
