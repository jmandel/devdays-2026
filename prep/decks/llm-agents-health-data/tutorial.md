# Tutorial: Let's Build With Health Data Agents

This tutorial is for the June 18 workshop. Pick one build lane and keep the agent working against local files, scripts, and source citations.

## Before The Session

Install a code-capable agent you can use with a local workspace. Claude Code, Codex, Cursor, or another agentic coding environment is fine as long as it can read files, run shell commands, and edit a project folder.

Install common tools:

```bash
git --version
bun --version
node --version
```

If Bun is missing:

```bash
curl -fsSL https://bun.sh/install | bash
```

For PDF verification in the Request My EHI lane, `poppler-utils` is useful:

```bash
sudo apt install poppler-utils
```

Work with sandbox or synthetic data during the workshop unless you have made a deliberate privacy decision. Do not upload real PHI to an agent or external service casually.

## Lane 1: Connect Portal Data With Health Skillz

Download-and-unzip path for a local agent workspace:

```bash
curl -O https://health-skillz.joshuamandel.com/skill.zip
unzip skill.zip
cd health-record-assistant
```

Then ask your local agent:

```text
Read SKILL.md and help me connect my health records.
```

Fastest hosted path:

1. Open `https://health-skillz.joshuamandel.com`.
2. Download the skill from `https://health-skillz.joshuamandel.com/skill.zip`.
3. Install the skill in an agent that supports skills.
4. Ask: `Can you look at my health records?`

Epic sandbox credentials from the repo README:

```text
Username: fhircamila
Password: epicepic1
```

Local developer path:

```bash
git clone https://github.com/jmandel/health-skillz
cd health-skillz
bun install
cp config.json.example config.local.json
bun run setup
mkdir -p static data
ln -snf "$(pwd)/brands" static/brands
CONFIG_PATH=./config.local.json bun run dev
curl -sS http://localhost:8000/health
```

What the agent should do after data arrives:

- Read the generated provider JSON files under `health-data/`.
- Treat SMART scopes as capability requests. A broad patient read scope such as `patient/*.rs` can make demos easy, but real apps should request only the scopes they need.
- Check FHIR resource arrays before making claims.
- Remember that note attachment content lives in `attachments[]`, not inline `DocumentReference.content[].attachment.data`.
- Cite file paths and relevant resource or note identifiers.

Useful prompt:

```text
Use the health-record-assistant skill. After the data arrives, build a concise clinical timeline. Show which files and resource types you used, inspect note attachments when relevant, and cite the source file/resource IDs for each important claim.
```

## Lane 2: Request A Complete EHI Export

Install the skill locally:

```bash
git clone https://github.com/jmandel/request-my-ehi.git ~/.claude/skills/request-my-ehi
cd ~/.claude/skills/request-my-ehi/scripts
bun install
```

Project-local install also works if your agent reads project skills:

```bash
mkdir -p .claude/skills
git clone https://github.com/jmandel/request-my-ehi.git .claude/skills/request-my-ehi
cd .claude/skills/request-my-ehi/scripts
bun install
```

Starter prompts:

```text
Help me request my complete EHI Export from Associated Physicians of Madison.
```

```text
I want to request all my health data from my provider. Their patient portal is at mychart.example.org.
```

The skill should produce a PDF package:

- Cover letter.
- Access request form.
- Vendor-specific appendix.

Important operating rule: drafting is not sending. The agent should show the PDF package for review and ask for explicit approval before faxing, emailing, mailing, or submitting anything.

Useful verification commands:

```bash
bun <skill-dir>/scripts/lookup-vendor.ts "athena"
bun <skill-dir>/scripts/list-form-fields.ts ./provider_form.pdf
pdftotext ./provider_form.pdf - | head -80
pdftoppm -png -r 150 -singlefile ./provider_form_filled.pdf ./preview
```

Commands like these are side effects and should not be run until the user approves the recipient, contents, page count, and send action:

```bash
bun <skill-dir>/scripts/send-fax.ts "+15551234567" ./ehi-request-provider.pdf
bun <skill-dir>/scripts/check-fax-status.ts <fax-id>
```

## Lane 3: Read An Epic EHI Export

Local skill paths for this workshop:

```text
/home/jmandel/hobby/ehi-2026-06.02/skills/reading-epic-ehi-export
/home/jmandel/hobby/ehi-2026-06.02/skills/ehi-deep-dives
```

The reading skill's core idea is top-down plus bottom-up inspection: use schema docs to orient, then verify against the real TSV files.

Typical commands:

```bash
bun scripts/load-ehi-sqlite.ts <raw-ehi-export-dir> db/ehi.sqlite
bun scripts/load-schema-docs.ts <raw-ehi-export-dir> db/ehi.sqlite
bun scripts/q.ts --table "select n_rows, table_name from _tables order by n_rows desc limit 20"
bun scripts/q.ts "select * from _schema_table limit 20"
bun scripts/q.ts "select * from _schema_column limit 20"
```

Remember:

- Real TSV columns can differ from schema docs.
- Use `PRAGMA table_info(<table>)` to inspect actual columns.
- Loaded values are usually TEXT; cast before numeric or date ordering.
- Notes, messages, and media often require fan-out across several files.

Useful prompt:

```text
Use the reading-epic-ehi-export skill. Inventory this export, identify the tables most relevant to medications, encounters, notes, and billing, and write a short evidence-backed map with the SQL you used. Do not summarize beyond what the files support.
```

## Lane 4: Build An EHI Deep Dive

Use this lane after you have loaded and understood enough of the export.

The deep-dive skill expects artifacts like:

```text
STORYBOARD.md
viewmodel.json
BUILD.md
parts/
scripts/
app.tsx
index.html
page.css
```

The view-model loop:

```text
EXTRACT -> ENRICH -> SYNTHESIZE
```

Build and screenshot:

```bash
bun build index.html --outdir dist
bun /home/jmandel/hobby/ehi-2026-06.02/skills/ehi-deep-dives/scripts/screenshot.ts dist shot.png 1100
bun /home/jmandel/hobby/ehi-2026-06.02/skills/ehi-deep-dives/scripts/serve.ts deep-dives 8088
```

Useful prompt:

```text
Use the ehi-deep-dives skill. Build a medication-history deep dive from this EHI export. Start with STORYBOARD.md and a viewmodel plan, then write scripts that extract evidence from SQLite. Keep every displayed claim traceable to source tables/files.
```

## Agent Operating Rules

- Start by reading `SKILL.md`.
- Ask the agent to list files and resource/table types before answering.
- Prefer code, grep, SQLite, and small scripts over stuffing a whole record into context.
- Keep PHI local unless the user explicitly approves another path.
- Cite files, resource IDs, note IDs, table names, or SQL queries.
- Separate findings from uncertainty and follow-up questions.
- Gate side effects: no fax, email, submit, upload, or live data sharing without explicit approval.
- Do not ask the agent for clinical advice. Ask it to organize evidence and draft questions for a care team.

## Troubleshooting

If the agent gives a generic summary, redirect it:

```text
Stop summarizing. Show the files/tables you inspected, the commands or scripts you ran, and one cited finding at a time.
```

If the EHI export feels overwhelming, start with inventory:

```text
Do not analyze yet. Build an inventory of available tables, row counts, schema descriptions, and likely clinical domains.
```

If a PDF workflow stalls, ask for visual verification:

```text
Render the generated PDF to images and inspect page 1 before proceeding. Do not send anything.
```
