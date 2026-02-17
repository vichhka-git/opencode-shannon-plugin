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
import urllib.request
from pathlib import Path


# Regex to extract path strings like "C:/project/path" from ["path1", "path2"]:
# "                - Opening quote before the path
# (...)            - Capture group: the path content without surrounding quotes
#   (?:            -   Match either:
#     [^"\\]       -     Normal characters (not quote or backslash)
#     |\\.         -     OR an escape sequence like \" or \\ (for paths with special chars)
#   )*             -   Zero or more characters forming the path
# "                - Closing quote after the path
JSON_STRING_PATTERN = r'"((?:[^"\\]|\\.)*)"'

# Expected schema for the "plugin" field (array of strings)
EXPECTED_PLUGIN_SCHEMA = {"type": "array", "items": {"type": "string"}}


def main():
    validate_plugin_schema()

    repo_root = Path(__file__).parent.parent.resolve()
    config_dir = Path.home() / ".config" / "opencode"

    if not config_dir.exists():
        print(f"Error: OpenCode config directory not found at {config_dir}")
        print("Please ensure OpenCode is installed and the config directory exists.")
        raise SystemExit(1)

    jsonc_file = config_dir / "opencode.jsonc"
    json_file = config_dir / "opencode.json"

    config_file = jsonc_file if jsonc_file.exists() else json_file

    plugin_path = repo_root.as_posix()

    if not config_file.exists():
        print(f"Error: OpenCode config file not found at {config_file}")
        print("Please ensure OpenCode is properly configured.")
        raise SystemExit(1)

    content = config_file.read_text(encoding="utf-8")
    merged = merge_plugin_path_jsonc(content, plugin_path)

    if merged is None:
        print(f"Plugin path already exists in {config_file} (no changes made).")
    else:
        backup = config_dir / f"{config_file.name}.bak.{int(time.time())}"
        shutil.copy2(config_file, backup)
        print(f"Existing config backed up to {backup}")

        config_file.write_text(merged, encoding="utf-8")
        print(f"Plugin path added to {config_file}")

    shannon_cfg = config_dir / "shannon-plugin.json"
    if not shannon_cfg.exists():
        try:
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
            )
            print(f"Created default shannon config at {shannon_cfg}")
        except OSError as e:
            print(f"Warning: Failed to create shannon config: {e}")
    else:
        print(
            f"User-level shannon config already exists at {shannon_cfg} (not overwriting)."
        )

    print("Done.")


def validate_plugin_schema():
    """Check if the remote schema's plugin field matches our expected structure."""
    try:
        with urllib.request.urlopen(
            "https://opencode.ai/config.json", timeout=10
        ) as response:
            schema = json.loads(response.read().decode("utf-8"))

        plugin_schema = schema.get("properties", {}).get("plugin")
        if plugin_schema is None:
            print("Error: 'plugin' field not found in remote schema")
            raise SystemExit(1)

        if plugin_schema != EXPECTED_PLUGIN_SCHEMA:
            print("Error: Remote schema 'plugin' field has changed structure.")
            print(f"Expected: {EXPECTED_PLUGIN_SCHEMA}")
            print(f"Got: {plugin_schema}")
            print("Please review the install script before proceeding.")
            raise SystemExit(1)

    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in remote schema: {e}")
        raise SystemExit(1)
    except Exception as e:
        print(f"Warning: Could not fetch schema for validation: {e}")
        print("Proceeding with installation (schema validation skipped).")


def extract_array_from_key(content: str, key: str) -> tuple[str, int, int] | None:
    """
    Find array value for a key, handling comments.
    Returns (plugin_paths_text, bracket_start, bracket_end) or None.
    """
    # Regex to find "plugin" key (not "myplugin" or other partial matches):
    # (?<!["\w])      - Ensure "plugin" doesn't follow a quote or letter (rejects "myplugin" but accepts "plugin")
    # "plugin"         - The literal key name in quotes
    # (?:\s*/\*.*?\*/)? - Optional: /* any comment */ between key and colon (handles "plugin"/*comment*/:)
    # \s*?             - Optional whitespace before colon
    # :                - The colon after the key
    key_pattern = r'(?<!["\w])"' + re.escape(key) + r'"(?:\s*/\*.*?\*/)?\s*?:'
    match = re.search(key_pattern, content, re.DOTALL)
    if not match:
        return None

    search_start = match.end()
    bracket_match = re.search(r"\[", content[search_start:])
    if not bracket_match:
        return None

    bracket_start = search_start + bracket_match.start()

    # Find matching ']' accounting for strings (paths can contain [ or ])
    bracket_depth = 1
    in_string = False
    scan_pos = bracket_start + 1

    while scan_pos < len(content) and bracket_depth > 0:
        char = content[scan_pos]
        if char == '"' and (scan_pos == 0 or content[scan_pos - 1] != "\\"):
            in_string = not in_string
        elif not in_string:
            if char == "[":
                bracket_depth += 1
            elif char == "]":
                bracket_depth -= 1
        scan_pos += 1

    if bracket_depth == 0:
        plugin_paths_text = content[bracket_start + 1 : scan_pos - 1]
        return plugin_paths_text, bracket_start, scan_pos - 1

    return None


def extract_plugin_paths(plugin_paths_text: str) -> list[str]:
    """
    Extract all plugin paths from the array text, ignoring comments.
    Handles escaped quotes within paths.
    """
    plugin_paths = re.findall(JSON_STRING_PATTERN, plugin_paths_text)
    return plugin_paths


def insert_into_array(
    plugin_paths_text: str, new_plugin_path: str, insert_pos: int
) -> str:
    """
    Insert a new plugin path into the array at the given position.
    Handles trailing comma: adds comma before new path if needed.
    """
    text_before = plugin_paths_text[:insert_pos]
    text_after = plugin_paths_text[insert_pos:]

    text_before = text_before.rstrip()
    if text_before and not text_before.endswith(","):
        text_before += ","

    new_path_str = f' "{new_plugin_path}"'

    return text_before + new_path_str + text_after


def merge_plugin_path_jsonc(config_content: str, plugin_path: str) -> str | None:
    """
    Merge plugin path into JSONC content, preserving all comments.
    Returns modified content, original content if path already exists, or None if key not found.
    """
    plugin_array_info = extract_array_from_key(config_content, "plugin")
    if not plugin_array_info:
        return None

    existing_paths_text, bracket_start, bracket_end = plugin_array_info
    existing_plugin_paths = extract_plugin_paths(existing_paths_text)

    if plugin_path in existing_plugin_paths:
        return config_content  # No change needed

    plugin_path_matches = list(re.finditer(JSON_STRING_PATTERN, existing_paths_text))

    if plugin_path_matches:
        last_plugin_path = plugin_path_matches[-1]
        insert_position = last_plugin_path.end()
    else:
        insert_position = 0

    updated_paths_text = insert_into_array(
        existing_paths_text, plugin_path, insert_position
    )

    updated_config = (
        config_content[:bracket_start]
        + "["
        + updated_paths_text
        + "]"
        + config_content[bracket_end + 1 :]
    )

    return updated_config


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise SystemExit(1)
