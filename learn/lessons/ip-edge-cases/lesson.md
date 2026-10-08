The difference between a solution that passes the examples and one that passes every hidden test is almost always edge cases. Interviewers know this, and many choose problems where the main idea is simple and the edges are where people slip. Finding them **before** you code is one of the most visible signs of experience.

## A checklist

Run through it for every problem, out loud:

- **Empty**: an empty string or list, zero items, nothing to do.
- **One**: a single item, a single character.
- **All the same**: every value equal, every character the same.
- **Boundaries of the values**: 0, negative numbers, the largest and smallest allowed values, and what happens when you add or multiply them.
- **Boundaries of the structure**: the first and last positions, the first and last row.
- **No answer / many answers**: what to return when nothing qualifies, and which one when several do.
- **Format**: leading or trailing spaces, upper and lower case, signs, extra characters.

## Example: parsing a time

Say you must parse `"HH:MM"` into minutes past midnight. The happy path is a split and two conversions. The edges are where the work is:

| Input | Question it raises |
|---|---|
| `"7:05"` | Is a one-digit hour allowed? |
| `" 07:05 "` | Are surrounding spaces allowed? |
| `"24:00"`, `"07:60"` | Out of range: reject, or wrap round? |
| `"07:5"` | One-digit minutes? |
| `"0705"`, `"07-05"`, `""` | No colon at all? |
| `"-1:30"` | A sign? |

None of these is hard on its own. But each is a decision, and the statement either answers it (read it again) or you ask. Then you write the code so each rule is **one clear step**, in the order the rules apply:

1. trim (or not),
2. find the separator, failing if it's missing,
3. check each part is digits only and the right length,
4. convert and range-check.

Code written as one clever expression hides the edges; code written as steps makes each one visible and easy to test.

## Overflow

When numbers can grow (parsing digits, multiplying, summing), ask how big they get. Building a number one digit at a time, `n = n * 10 + digit`, passes 2³¹ after ten digits. Some languages wrap around silently; JavaScript loses precision after 2⁵³. The safe habit is to **stop as soon as the value is already out of range**, before it can overflow: once you know the answer will be clamped, more digits change nothing.

## Test them, don't just list them

After coding, run your code by hand on three or four of the edges, the ones most likely to break it. In the exercise below the statement spells out the rules precisely; turn each into a step, write your list of awkward inputs first, and check each one before you submit.
