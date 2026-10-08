A network has `n` servers, numbered `0` to `n - 1`, and two-way `links`. A link is **critical** if cutting it leaves some pair of servers that could reach each other unable to.

Return every critical link as `[a, b]` with `a < b`, in any order. The same pair of servers can be joined by more than one link (then neither of those links is critical), and the network isn't necessarily connected to begin with.

## Constraints

- `1 <= n <= 100000`
- `0 <= links.length <= 200000`
- `0 <= a, b < n`, `a != b`
