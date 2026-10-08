## Hint

Whole minutes are `seconds` divided by 60, rounded down. What's left over is the remainder: `seconds % 60`.

## Hint

The seconds part needs two digits: `5` should come out as `05`. Add a leading zero when it's below 10, or use `padStart(2, "0")` in JavaScript and `f"{s:02d}"` in Python.
