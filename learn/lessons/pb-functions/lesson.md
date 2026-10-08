So far you've filled in functions someone else named. Writing your own is how a program stays readable as it grows: each function does one job, has a name that says what, and can be used again.

## Defining and calling

```javascript
function area(width, height) {
  return width * height;
}

const kitchen = area(4, 3); // 12
```

```python
def area(width, height):
    return width * height

kitchen = area(4, 3)  # 12
```

- `width` and `height` are **parameters**: names for the values the function receives.
- `4` and `3` are **arguments**: the values passed in when you *call* it.
- `return` hands a value back and ends the function at once. A function without `return` gives back `undefined` (JavaScript) or `None` (Python).

## Return, don't print

A function that prints its answer can only show it. A function that **returns** it lets the caller do anything with it: add it up, compare it, print it. On Ninjathons the tests call your function and check what it returns, so printing the answer instead of returning it fails, even if the right number appears on screen.

Printing is still useful while you work: anything you `console.log` or `print` shows up next to that test's result when you press Run.

## One job each

Split a problem into small functions when a piece has a name of its own:

```javascript
function isWeekend(day) {
  return day === "Sat" || day === "Sun";
}

function openingHour(day) {
  return isWeekend(day) ? 10 : 8;
}
```

```python
def is_weekend(day):
    return day in ("Sat", "Sun")

def opening_hour(day):
    return 10 if is_weekend(day) else 8
```

A function that answers a yes/no question returns `true`/`false` directly. There's no need for `if (…) return true; else return false;`: return the condition itself.

`a ? b : c` (JavaScript) and `b if a else c` (Python) pick between two values in one line.

## Formulas

Many functions are a formula written in code. Copy the formula exactly, and mind the order: `*` and `/` happen before `+` and `-`, just as in maths, and brackets go first. When in doubt, add brackets: `(c * 9) / 5 + 32` can't be misread.

Then check it on a case you know. For Celsius to Fahrenheit, 0 °C is 32 °F and 100 °C is 212 °F.

## Rules with exceptions

Some rules come with exceptions to the exceptions, like the leap year rule. Write them from the most specific case to the most general, or as one expression joined with `&&` and `||`, and test a year for each rule: one that's divisible by 4 only, one by 100, one by 400.
