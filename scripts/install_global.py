#!/usr/bin/env python3
"""
Install this plugin into the user-level OpenCode config at ~/.config/opencode/opencode.json
- Safely merges the plugin path into the existing `plugin` array
- Backs up the existing config to <filename>.bak.<timestamp>
- Preserves comments in JSONC files
Requirements: python3
"""

import json
import re
import shutil
import time
from pathlib import Path


def main():
    repo_root = Path(__file__).parent.parent.resolve()
    config_dir = Path.home() / ".config" / "opencode"

    jsonc_file = config_dir / "opencode.jsonc"
    json_file = config_dir / "opencode.json"

    config_file = jsonc_file if jsonc_file.exists() else json_file
    config_dir.mkdir(parents=True, exist_ok=True)

    plugin_path = repo_root.as_posix()

    if config_file.exists():
        backup = config_dir / f"{config_file.name}.bak.{int(time.time())}"
        shutil.copy2(config_file, backup)
        print(f"Existing config backed up to {backup}")

        content = config_file.read_text(encoding="utf-8")
        merged = merge_plugin_path_jsonc(content, plugin_path)

        if merged is None:
            try:
                cfg = json.loads(content)
            except Exception:
                cfg = {}
            cfg.setdefault("plugin", []).append(plugin_path)
            merged = json.dumps(cfg, indent=2)

        config_file.write_text(merged, encoding="utf-8")
        print(f"Plugin path added to {config_file}")

    shannon_cfg = config_dir / "shannon-plugin.json"
    if not shannon_cfg.exists():
        shannon_cfg.write_text(
            json.dumps(
                {
                    "shannon": {
                        "require_authorization": False,
                        "docker_image": "shannon-tools",
                        "browser_testing": True,
                        "idor_testing": True,
                        "upload_testing": True,
                    }
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"Created default shannon config at {shannon_cfg}")
    else:
        print(
            f"User-level shannon config already exists at {shannon_cfg} (not overwriting)."
        )

    print("Done.")


def extract_array_from_key(content: str, key: str) -> tuple[str, int, int] | None:
    """
    Find array value for a key, handling comments.
    Returns (array_content, array_start, end_pos) or None.
    """
    key_pattern = r'"' + key + r'"'
    match = re.search(key_pattern, content)
    if not match:
        return None

    search_start = match.end()
    colon_match = re.search(r":", content[search_start:])
    if not colon_match:
        return None

    colon_pos = search_start + colon_match.end()
    bracket_match = re.search(r"\[", content[colon_pos:])
    if not bracket_match:
        return None

    start = colon_pos + bracket_match.start()

    # Find matching ']' accounting for strings (paths can contain [ or ])
    depth = 1
    in_string = False
    i = start + 1

    while i < len(content) and depth > 0:
        char = content[i]
        if char == '"' and (i == 0 or content[i - 1] != "\\"):
            in_string = not in_string
        elif not in_string:
            if char == "[":
                depth += 1
            elif char == "]":
                depth -= 1
        i += 1

    if depth == 0:
        array_content = content[start + 1: i - 1]
        return array_content, start, i - 1

    return None


def extract_strings_from_array(array_content: str) -> list[str]:
    """
    Extract all double-quoted strings from array content, ignoring comments.
    Handles escaped quotes within strings.
    """
    pattern = r'"((?:[^"\\]|\\.)*)"'
    matches = re.findall(pattern, array_content)
    return matches


def insert_into_array(array_content: str, new_item: str, insert_pos: int) -> str:
    """
    Insert a new string item into the array at the given position.
    Handles trailing comma: adds comma before new item if needed.
    """
    # Get the content before insert_pos and after
    before = array_content[:insert_pos]
    after = array_content[insert_pos:]

    # Check if there's already a trailing comma or if we need one
    before = before.rstrip()
    if before and not before.endswith(","):
        before += ","

    new_item_str = f' "{new_item}"'

    return before + new_item_str + after


def merge_plugin_path_jsonc(content: str, plugin_path: str) -> str | None:
    """
    Merge plugin path into JSONC content, preserving all comments.
    Returns modified content, or original content if path already exists.
    """
    # Find the "plugin" key and extract its array
    result = extract_array_from_key(content, "plugin")
    if not result:
        # Key doesn't exist - we'll let json.dump handle adding it
        return None

    array_content, array_start, end_pos = result

    # Extract existing strings from the array
    existing_paths = extract_strings_from_array(array_content)

    # Check if path already exists
    if plugin_path in existing_paths:
        return content  # No change needed

    # Find the last string in the array to insert after it
    # We need to find position in original array_content, not just extract strings
    # Find all string positions
    string_pattern = r'"((?:[^"\\]|\\.)*)"'
    string_matches = list(re.finditer(string_pattern, array_content))

    if string_matches:
        # Insert after the last string
        last_match = string_matches[-1]
        # Position right after the closing quote of last string
        insert_position = last_match.end()
    else:
        # Array is empty or only has comments/whitespace
        # Insert at the beginning (after '[')
        insert_position = 0

    # Insert the new path
    new_array_content = insert_into_array(array_content, plugin_path, insert_position)

    new_content = (
            content[:array_start] + "[" + new_array_content + "]" + content[end_pos + 1:]
    )

    return new_content


if __name__ == "__main__":
    main()
