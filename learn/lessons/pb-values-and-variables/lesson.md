A program is a list of instructions the computer follows from top to bottom. Most of what those instructions do is work with **values** (numbers, text, true or false) and keep them in **variables** so they can be used again.

## Values

Every value has a type. The three you'll use from the start:

| Type | Examples | In JavaScript | In Python |
|---|---|---|---|
| Number | `42`, `-7`, `3.5` | `number` | `int` (whole), `float` (with a fraction) |
| Text | `"hello"`, `"42"` | `string` | `str` |
| True or false | `true` / `false` | `boolean` | `bool`: `True` / `False` |

`42` and `"42"` are different: the first is a number you can do sums with, the second is two characters of text.

## Variables

A variable is a name for a value. You give it a value once and use the name from then on:

```javascript
const price = 12;
const quantity = 3;
const total = price * quantity;
console.log(total); // 36
```

```python
price = 12
quantity = 3
total = price * quantity
print(total)  # 36
```

In JavaScript, `const` makes a variable that never changes and `let` one that can. Python has neither: you just write the name. Names should say what the value *is*: `total` is better than `t` or `x`.

## Arithmetic

The usual operators work on numbers: `+`, `-`, `*`, `/`. Two more come up all the time:

- **Whole-number division** rounds down: `Math.floor(7 / 2)` in JavaScript, `7 // 2` in Python. Both give `3`.
- **Remainder** (also called *modulo*) is what's left over: `7 % 2` is `1`, because 7 is 3 twos and 1 left.

Together they split a quantity into parts. 125 seconds is `Math.floor(125 / 60)` = 2 minutes and `125 % 60` = 5 seconds.

## Text

Text goes in quotes. `+` joins two pieces of text, and you can build text out of values:

```javascript
const name = "Ada";
const minutes = 2;
console.log(`${name} finished in ${minutes} minutes`);
```

```python
name = "Ada"
minutes = 2
print(f"{name} finished in {minutes} minutes")
```

These are *template strings* in JavaScript (backticks and `${…}`) and *f-strings* in Python (`f"…"` and `{…}`).

To pad a number with a leading zero, so 5 shows as `05`: `String(5).padStart(2, "0")` in JavaScript, `f"{5:02d}"` in Python.

## Functions you'll fill in

On Ninjathons most exercises give you a **function** to complete: it receives values (its *parameters*) and gives one back with `return`. You'll write functions of your own in a later lesson; for now, read the parameters, work out the answer, and return it:

```javascript
function addTwo(a, b) {
  return a + b;
}
```

```python
def add_two(a, b):
    return a + b
```

Press **Run** to try your code on the examples, and **Submit** when it passes them: Submit runs the hidden tests too.
