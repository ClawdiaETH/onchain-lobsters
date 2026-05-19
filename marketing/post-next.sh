#!/usr/bin/env bash
# post-next.sh — migrated system-crontab shim
# MIGRATED-PAUSED-2026-05-18 during Hermes migration.
# Reason: public social posting to X/Farcaster needs explicit approval and the
# campaign only has a bonus slot left. Original source moved to paused Hermes
# job clawdia-onchain-lobsters-post-next.
set -euo pipefail
LOG="$HOME/clawd/logs/lobster-marketing.log"
mkdir -p "$(dirname "$LOG")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] onchain-lobsters post-next migrated to paused Hermes cron; system crontab shim no-op." >> "$LOG"
exit 0
