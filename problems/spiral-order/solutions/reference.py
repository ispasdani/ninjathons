def spiral_order(matrix: list[list[int]]) -> list[int]:
    out = []
    rows = [list(row) for row in matrix]
    while rows:
        out.extend(rows.pop(0))
        # Turn what's left a quarter anticlockwise, so its right column becomes the top row.
        rows = [list(r) for r in zip(*rows)][::-1]
    return out
