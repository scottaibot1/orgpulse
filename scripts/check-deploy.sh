#!/usr/bin/env bash
# PostToolUse hook: after any Bash call, if it was "git push", poll Vercel until
# the deployment succeeds or fails. Prints status back to Claude.

set -euo pipefail

# Read the hook payload (JSON with tool_name + tool_input)
INPUT=$(cat 2>/dev/null || true)

# Extract the bash command that was run
COMMAND=$(node -e "
try {
  const d = JSON.parse(process.argv[1] || '{}');
  process.stdout.write(
    d.tool_input?.command ||
    d.command ||
    ''
  );
} catch(e) { process.stdout.write(''); }
" -- "$INPUT" 2>/dev/null || echo "")

# Only proceed for git push
if [[ "$COMMAND" != *"git push"* ]]; then
  exit 0
fi

printf '\n🔍 Verifying Vercel deployment...\n' >&2

REPO_DIR="/Users/scott/orgpulse"
cd "$REPO_DIR"

# Give Vercel a moment to pick up the push before first poll
sleep 8

MAX_WAIT=360   # 6 minutes
POLL=15
ELAPSED=8

while (( ELAPSED < MAX_WAIT )); do
  # Grab the first deployment line that has a status bullet
  LATEST=$(npx vercel ls 2>/dev/null \
    | grep -E "●\s+(Ready|Error|Building|Queued|Canceled|Initializing)" \
    | head -1 || true)

  if [[ -z "$LATEST" ]]; then
    printf '⏳ Waiting for deployment to register... (%ds)\n' "$ELAPSED" >&2
    sleep "$POLL"
    (( ELAPSED += POLL ))
    continue
  fi

  URL=$(echo "$LATEST" | grep -oE 'https://[^ ]+' || true)

  if [[ "$LATEST" == *"● Ready"* ]]; then
    printf '✅ Vercel deploy SUCCEEDED: %s\n' "$URL" >&2
    # Output to stdout so Claude sees it in conversation
    echo "Vercel deployment succeeded: $URL"
    exit 0
  elif [[ "$LATEST" == *"● Error"* ]]; then
    printf '❌ Vercel deploy FAILED: %s\n' "$URL" >&2
    # Non-zero exit causes Claude Code to surface the message to the user
    echo "ERROR: Vercel deployment FAILED ($URL) — build error in production. Run: npx vercel logs $URL"
    exit 1
  else
    STATUS=$(echo "$LATEST" | grep -oE '● \w+' | head -1 | sed 's/● //')
    printf '⏳ %s... (%ds elapsed)\n' "${STATUS:-Deploying}" "$ELAPSED" >&2
    sleep "$POLL"
    (( ELAPSED += POLL ))
  fi
done

echo "ERROR: Vercel deployment timed out after ${MAX_WAIT}s — check: npx vercel ls"
exit 1
