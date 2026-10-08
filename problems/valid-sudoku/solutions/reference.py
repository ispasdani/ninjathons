def is_valid_sudoku(board: list[str]) -> bool:
    seen = set()
    for r in range(9):
        for c in range(9):
            d = board[r][c]
            if d == ".":
                continue
            for key in (("r", r, d), ("c", c, d), ("b", r // 3 * 3 + c // 3, d)):
                if key in seen:
                    return False
                seen.add(key)
    return True
