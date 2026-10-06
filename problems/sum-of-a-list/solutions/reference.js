const tokens = require("fs").readFileSync(0, "utf8").trim().split(/\s+/).map(Number);
let sum = 0;
for (let i = 1; i < tokens.length; i++) sum += tokens[i];
console.log(String(sum));
