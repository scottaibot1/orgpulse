# OrgRise Final Build — Drop-In Replacement

This package contains two files to update:

## Step 1: Replace email rendering functions in report-renderer.ts

Open `lib/report-renderer.ts`. Replace the following functions with the versions in `email-functions-replacement.ts`:

- `buildE()` (starting ~line 481)
- `emailPill()` (~line 874)
- `emailBadgeDual()` (~line 473)
- `emailStatusBadgeDual()` (~line 477)
- `emailTask()` (~line 879)
- `emailTomorrowItem()` (~line 916)
- `emailTimeBars()` (~line 925)
- `emailPipelineGrid()` (~line 968)
- `emailPersonCard()` (~line 994)
- `emailDeptSection()` (~line 1096)
- `emailNeedsAttention()` (~line 1115)
- `emailNotableProgress()` (~line 1162)
- `emailPulse()` (~line 1193)
- `renderEmailHtml()` (~line 1226)

Paste the Claude Code prompt in `claude-code-prompt.md` into Claude Code to execute this.

## Step 2: Append AI reinforcements to executive-summary-v2.txt

Append the content of `ai-prompt-additions.txt` to the end of `prompts/executive-summary-v2.txt`.
