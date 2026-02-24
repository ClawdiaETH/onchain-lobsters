#!/usr/bin/env bash
# post-next.sh — Post the next unposted Onchain Lobsters marketing slot
# Reads campaign-3day.md, finds first [ ] slot, posts X + FC, marks [X]
set -euo pipefail

CAMPAIGN="$HOME/clawd/projects/onchain-lobsters/marketing/campaign-3day.md"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX Starting post-next.sh"

# Check if campaign file exists
if [[ ! -f "$CAMPAIGN" ]]; then
  echo "$LOG_PREFIX ERROR: Campaign file not found at $CAMPAIGN"
  exit 1
fi

# Use Python to parse and post the next slot
python3 << 'PYEOF'
import sys
import os
import re
import subprocess
import json
import urllib.request
import urllib.error

CAMPAIGN = os.path.expanduser("~/clawd/projects/onchain-lobsters/marketing/campaign-3day.md")

def get_secret(key):
    result = subprocess.run(
        [os.path.expanduser("~/clawd/scripts/get-secret.sh"), key],
        capture_output=True, text=True
    )
    return result.stdout.strip()

def post_x(text):
    script = os.path.expanduser("~/clawd/skills/x-api/scripts/x-post.mjs")
    result = subprocess.run(
        ["/opt/homebrew/bin/node", script, text],
        capture_output=True, text=True, timeout=60
    )
    print(f"X stdout: {result.stdout.strip()}")
    if result.returncode != 0:
        print(f"X stderr: {result.stderr.strip()}")
        return None
    # Extract URL from output like: ✅ Posted: https://x.com/i/status/...
    match = re.search(r'https://x\.com/i/status/(\d+)', result.stdout)
    if match:
        return f"https://x.com/i/status/{match.group(1)}"
    return "posted-no-url"

def post_farcaster(text, channel="ai"):
    neynar_key = get_secret("neynar_api_key")
    signer_uuid = get_secret("farcaster_signer_uuid")
    
    payload = json.dumps({
        "signer_uuid": signer_uuid,
        "text": text,
        "embeds": [{"url": "https://onchainlobsters.xyz"}],
        "channel_id": channel
    }).encode("utf-8")
    
    req = urllib.request.Request(
        "https://api.neynar.com/v2/farcaster/cast",
        data=payload,
        headers={
            "api_key": neynar_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            cast_hash = data.get("cast", {}).get("hash", "ERR")
            print(f"FC hash: {cast_hash}")
            return cast_hash
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"FC error {e.code}: {body}")
        return None

def parse_slots(content):
    """Parse campaign file into list of slot dicts."""
    slots = []
    # Split on ## Day / ## slot headers
    blocks = re.split(r'\n(?=## Day \d)', content)
    for block in blocks:
        if not block.strip() or not block.startswith("## Day"):
            continue
        # Extract header
        header_match = re.match(r'^## (Day \d+ — Slot \d+ \(Hour \d+\))', block)
        if not header_match:
            continue
        header = header_match.group(1)
        
        # Status
        status_match = re.search(r'\*\*Status:\*\* (\[.\].*)', block)
        status = status_match.group(1) if status_match else "[ ]"
        is_posted = not status.startswith("[ ]")
        
        # X text
        x_match = re.search(r'\*\*X:\*\* (.+?)(?=\n\*\*FC:|$)', block, re.DOTALL)
        x_text = x_match.group(1).strip() if x_match else ""
        
        # FC text and channel
        fc_match = re.search(r'\*\*FC:\*\* (.+?)\s*\|\s*channel:\s*(\w+)', block, re.DOTALL)
        if fc_match:
            fc_text = fc_match.group(1).strip()
            fc_channel = fc_match.group(2).strip()
        else:
            fc_text = x_text
            fc_channel = "ai"
        
        slots.append({
            "header": header,
            "status": status,
            "is_posted": is_posted,
            "x_text": x_text,
            "fc_text": fc_text,
            "fc_channel": fc_channel,
        })
    return slots

def update_status(content, header, x_url, fc_hash):
    """Mark a slot as posted in the file content."""
    old_line = f"**Status:** [ ]"
    new_line = f"**Status:** [X] X: {x_url} | FC: {fc_hash}"
    # Only replace within the block for this header — find the header first
    header_escaped = re.escape(header)
    # Find the block and replace the first [ ] status after it
    pattern = rf'(## {header_escaped}\n\*\*Status:\*\* )\[ \]'
    replacement = rf'\1[X] X: {x_url} | FC: {fc_hash}'
    new_content = re.sub(pattern, replacement, content, count=1)
    return new_content

# Main
with open(CAMPAIGN, 'r') as f:
    content = f.read()

slots = parse_slots(content)
unposted = [s for s in slots if not s["is_posted"]]

if not unposted:
    print("All slots have been posted. Campaign complete.")
    sys.exit(0)

slot = unposted[0]
print(f"Posting: {slot['header']}")
print(f"X text ({len(slot['x_text'])} chars): {slot['x_text'][:80]}...")
print(f"FC channel: {slot['fc_channel']}")

# Post X
x_url = post_x(slot["x_text"])
if not x_url:
    print("ERROR: X post failed")
    sys.exit(1)
print(f"X posted: {x_url}")

# Post Farcaster
import time
time.sleep(3)
fc_hash = post_farcaster(slot["fc_text"], slot["fc_channel"])
if not fc_hash:
    print("ERROR: FC post failed")
    # Don't exit — X post succeeded, mark with partial status
    fc_hash = "FC-FAILED"

# Update campaign file
with open(CAMPAIGN, 'r') as f:
    content = f.read()

new_content = update_status(content, slot["header"], x_url, fc_hash)
with open(CAMPAIGN, 'w') as f:
    f.write(new_content)

print(f"✅ Slot posted and marked: {slot['header']}")
print(f"   X: {x_url}")
print(f"   FC: {fc_hash}")
PYEOF

echo "$LOG_PREFIX post-next.sh complete"
