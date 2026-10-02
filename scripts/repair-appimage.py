#!/usr/bin/env python3
"""Repack a trusted DevTrack AppImage using the host's Wayland libraries."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def repair(image: Path) -> None:
    image = image.resolve(strict=True)
    offset = int(subprocess.check_output([str(image), "--appimage-offset"], text=True).strip())
    if offset <= 0 or offset >= image.stat().st_size:
        raise ValueError("Invalid AppImage filesystem offset")
    with tempfile.TemporaryDirectory(prefix="devtrack-appimage-") as directory:
        work = Path(directory)
        subprocess.run([str(image), "--appimage-extract"], cwd=work, check=True, stdout=subprocess.DEVNULL)
        root = work / "squashfs-root"
        removed = 0
        for name in ("libwayland-client.so.0", "libwayland-cursor.so.0", "libwayland-egl.so.1", "libwayland-server.so.0"):
            for library in root.rglob(name):
                library.unlink()
                removed += 1
        if not removed:
            print("No bundled Wayland libraries to remove")
            return
        filesystem = work / "filesystem.squashfs"
        subprocess.run(["mksquashfs", str(root), str(filesystem), "-noappend", "-comp", "gzip", "-no-xattrs", "-processors", "2"], check=True, stdout=subprocess.DEVNULL)
        descriptor, temporary = tempfile.mkstemp(prefix=image.name + ".", dir=image.parent)
        try:
            with os.fdopen(descriptor, "wb") as output, image.open("rb") as original:
                remaining = offset
                while remaining:
                    chunk = original.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        raise ValueError("Truncated AppImage runtime")
                    output.write(chunk)
                    remaining -= len(chunk)
                with filesystem.open("rb") as payload:
                    shutil.copyfileobj(payload, output)
            os.chmod(temporary, image.stat().st_mode & 0o777)
            subprocess.run([temporary, "--appimage-offset"], check=True, stdout=subprocess.DEVNULL)
            os.replace(temporary, image)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        print(f"Repacked {image.name}; removed {removed} bundled Wayland libraries")


if __name__ == "__main__":
    repair(Path(sys.argv[1]))
