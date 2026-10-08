Text is a *string*: a sequence of characters. Strings behave a lot like lists of characters, plus a toolbox of methods for the usual jobs.

## Characters and length

```javascript
const s = "hello";
s.length;    // 5
s[0];        // "h"
for (const ch of s) {
  // "h", "e", "l", "l", "o"
}
```

```python
s = "hello"
len(s)       # 5
s[0]         # "h"
for ch in s:
    pass     # "h", "e", "l", "l", "o"
```

Strings can't be changed in place. Methods return a **new** string, so keep the result: `s = s.toUpperCase()`.

## Everyday methods

| Job | JavaScript | Python |
|---|---|---|
| Upper / lower case | `s.toUpperCase()`, `s.toLowerCase()` | `s.upper()`, `s.lower()` |
| Remove spaces at both ends | `s.trim()` | `s.strip()` |
| Contains? | `s.includes("lo")` | `"lo" in s` |
| Split into a list | `s.split(",")` | `s.split(",")` |
| Join a list into a string | `parts.join(" ")` | `" ".join(parts)` |
| Reverse a list | `parts.reverse()` | `parts.reverse()` or `reversed(parts)` |

## Checking characters

To ask "is this character one of these?", keep the allowed characters in a string and use `includes` or `in`:

```javascript
const isDigit = "0123456789".includes(ch);
```

```python
is_digit = ch in "0123456789"
```

Upper and lower case are different characters: `"A"` isn't `"a"`. When case shouldn't matter, turn everything to lower case first.

## Splitting into words

`split(" ")` splits on **every** single space, so two spaces in a row produce an empty string between them:

```javascript
"a  b".split(" ");       // ["a", "", "b"]
"a  b".trim().split(/\s+/); // ["a", "b"]
```

```python
"a  b".split(" ")   # ["a", "", "b"]
"a  b".split()      # ["a", "b"]
```

In Python, `split()` with nothing in the brackets splits on any run of spaces and ignores spaces at the ends. In JavaScript, `/\s+/` is a *regular expression* meaning "one or more spaces": trim the ends first, then split on that.

Split, change the list, join it back: that's how most "rearrange the words" problems go.
