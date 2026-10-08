def format_time(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"
