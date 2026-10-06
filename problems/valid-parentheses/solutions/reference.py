def is_valid(s: str) -> bool:
    partner = {")": "(", "]": "[", "}": "{"}
    stack = []
    for c in s:
        if c in partner:
            if not stack or stack.pop() != partner[c]:
                return False
        else:
            stack.append(c)
    return not stack
