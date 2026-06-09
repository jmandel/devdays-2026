BUN := $(shell command -v bun 2>/dev/null || echo /home/exedev/.bun/bin/bun)

.PHONY: start dev typecheck

start:
	$(BUN) run src/server.ts

dev:
	$(BUN) --watch run src/server.ts

typecheck:
	$(BUN) x tsc --noEmit --skipLibCheck
