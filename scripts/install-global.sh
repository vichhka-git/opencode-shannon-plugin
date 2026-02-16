#!/usr/bin/env bash
set -euo pipefail

# Install this plugin into the user-level OpenCode config at ~/.config/opencode/opencode.json
# - Safely merges the plugin path into the existing `plugin` array
# - Backs up the existing config to opencode.json.bak.TIMESTAMP
# Requirements: python3

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
CONFIG_FILE="$CONFIG_DIR/opencode.json"
PLUGIN_PATH="$REPO_ROOT"

mkdir -p "$CONFIG_DIR"
timestamp=$(date +%s)
if [ -f "$CONFIG_FILE" ]; then
  cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$timestamp"
  echo "Existing config backed up to $CONFIG_FILE.bak.$timestamp"
fi

if command -v python3 >/dev/null 2>&1; then
  python3 - "$PLUGIN_PATH" "$CONFIG_FILE" <<'PY'
import json,sys,os
plugin_path=sys.argv[1]
config_file=sys.argv[2]
cfg={}
if os.path.exists(config_file):
    try:
        with open(config_file) as fh:
            cfg=json.load(fh)
    except Exception as e:
        print("Failed to parse existing config:", e, file=sys.stderr)
        sys.exit(1)
if not isinstance(cfg, dict):
    cfg={}
pl=cfg.get("plugin")
if pl is None or not isinstance(pl, list):
    pl=[]
if plugin_path not in pl:
    pl.append(plugin_path)
cfg["plugin"]=pl
with open(config_file,"w") as fh:
    json.dump(cfg,fh,indent=2)
print("Updated",config_file)
PY
echo "Plugin path added to $CONFIG_FILE (if it wasn't already present)."
else
  echo "python3 is required to merge safely. Install python3 and re-run this script, or manually add \"$PLUGIN_PATH\" to $CONFIG_FILE"
  exit 2
fi

echo "Done."

# Create a default shannon-plugin.json if it doesn't exist (user-level)
SHANNON_CFG="$CONFIG_DIR/shannon-plugin.json"
if [ -f "$SHANNON_CFG" ]; then
  echo "User-level shannon config already exists at $SHANNON_CFG (not overwriting)."
else
  cp /dev/null "$SHANNON_CFG"
  cat > "$SHANNON_CFG" <<'JSON'
{
  "shannon": {
    "require_authorization": false,
    "docker_image": "shannon-tools",
    "browser_testing": true,
    "idor_testing": true,
    "upload_testing": true
  }
}
JSON
  echo "Created default shannon config at $SHANNON_CFG"
fi
