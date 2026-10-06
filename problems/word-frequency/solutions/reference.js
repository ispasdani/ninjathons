const text = require("fs").readFileSync(0, "utf8");
const counts = new Map();
for (const w of text.match(/[A-Za-z]+/g) ?? []) {
  const key = w.toLowerCase();
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
const rows = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
process.stdout.write(rows.map(([w, c]) => w + " " + c + "\n").join(""));
