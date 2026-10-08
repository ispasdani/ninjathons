Most problems here give you a function to fill in. Some are **full programs** instead: your code reads the input itself, as text, and prints the answer. That's how most contest sites work, and how command-line tools work too.

## Where input comes from

The input arrives on *standard input* (stdin): the text the program would read from the keyboard, but filled in by the judge. The output goes to *standard output* (stdout): what `console.log` or `print` writes. The judge compares your output with the expected text line by line; spaces at the end of lines are ignored.

## Read everything, then split

The simplest and fastest approach: read all of the input at once, then split it into pieces.

```javascript
const input = require("fs").readFileSync(0, "utf8");
const tokens = input.trim().split(/\s+/); // every word or number, in order
const n = Number(tokens[0]);
```

```python
import sys

tokens = sys.stdin.read().split()  # every word or number, in order
n = int(tokens[0])
```

Splitting on whitespace ignores line breaks, which is usually what you want: "the first number, then n numbers" works the same whether they're on one line or many. When lines matter, split on lines instead: `input.split("\n")` or `sys.stdin.read().splitlines()`.

Everything you read is **text**: convert with `Number(…)` or `int(…)` before doing sums. `"2" + "3"` is `"23"`.

## Printing

Print exactly what the statement asks for, and nothing else: no "The answer is", no extra blank lines.

```javascript
console.log(String(total));
console.log(lines.join("\n")); // many lines at once
```

```python
print(total)
print("\n".join(lines))  # many lines at once
```

With a lot of output, build one big string and print it once. Printing a hundred thousand times one line at a time is much slower, especially in Python.

## Big numbers

The sum of 200,000 numbers of up to a billion each goes past 2³¹, the limit of a 32-bit integer. Python's integers never overflow. JavaScript numbers are exact up to about 9 × 10¹⁵ (2⁵³), which covers this. In Java, C# or C++, use a 64-bit type (`long`, `long long`).

## Counting words

The second exercise reads free text, counts each word and prints the counts in order. It combines three things from other lessons: split the text into words (here, runs of letters, so punctuation separates words; a regular expression like `/[a-z]+/gi` or `re.findall("[a-z]+", text, re.I)` finds them), count them in a hash map, then sort the entries by count, highest first, and alphabetically when counts tie.
