from pathlib import Path


class StorageService:
    def __init__(self, base_dir: str = "output") -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, filename: str, content: bytes) -> str:
        target = self.base_dir / filename
        target.write_bytes(content)
        return str(target)
