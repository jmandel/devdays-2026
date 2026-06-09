# Publication Checklist

Before creating or pushing `jmandel/devdays-2026`:

- Keep `background/` out of Git. It is about 3.5 GB and contains cloned repos, downloaded specs, scraped EHI materials, logs, caches, and source-research artifacts.
- Keep final deck artifacts: `deck.md`, `visual-brief.md`, `prompts/`, `slides/`, `preview.png`, `deck.html`, and `deck.pptx`.
- Exclude old generated variants: `archive/`, `backups/`, `generated-visual-drafts/`, `generated-image-cache/`, `slides-*`, `final-image-sequence/`, `contact-sheets/`, and `*.pre-*.png`.
- Re-check for secrets before the first push:

```bash
rg -n --hidden -S '(OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|BEGIN (RSA|OPENSSH|PRIVATE) KEY|password\\s*=|secret\\s*=|api[_-]?key)' . -g '!**/.git/**' -g '!background/**'
```

- Check what Git would include:

```bash
git init
git add --dry-run .
```

- Check repo size before committing:

```bash
git ls-files -z | xargs -0 du -ch | tail -1
```

The expected committed size is dominated by generated slide images plus HTML/PPTX exports. If that feels too large, the cleanest follow-up is to keep either `deck.html` or `deck.pptx`, not both, or move binary decks to GitHub Releases.
