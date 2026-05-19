#!/usr/bin/env python3
"""
Merge the <!-- BEGIN claude-skills --> block from the repo CLAUDE.md
into the local ~/.claude/CLAUDE.md without overwriting machine-specific content.

Usage: python3 merge_claude_md.py <repo_claude_md> <local_claude_md>
"""
import re
import sys
from pathlib import Path

START = "<!-- BEGIN claude-skills -->"
END = "<!-- END claude-skills -->"

repo_path = Path(sys.argv[1])
local_path = Path(sys.argv[2])

repo_block = repo_path.read_text().strip()

if local_path.exists():
    local = local_path.read_text()
    if START in local:
        # Replace existing block, preserve everything outside it
        merged = re.sub(
            rf"{re.escape(START)}.*?{re.escape(END)}",
            repo_block,
            local,
            flags=re.DOTALL,
        )
    else:
        # Append block — machine-specific content above is untouched
        merged = local.rstrip() + "\n\n" + repo_block + "\n"
else:
    merged = repo_block + "\n"

local_path.write_text(merged)
print(f"CLAUDE.md merged → {local_path}")
