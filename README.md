# pwndoc-mcp

A local [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives Claude (and any MCP-capable AI client) direct, token-efficient access to [PwnDoc](https://pwndoc.github.io/pwndoc/) — the open-source pentest reporting platform.

No changes to the PwnDoc backend are required. The server authenticates with a standard PwnDoc API key and wraps the existing REST API.

**What you get:**

- Persistent session across conversations (API-key auth, no cookie juggling)
- "Current audit" context — set it once, all tools default to it
- Granular finding read/write (field-level updates, projection-aware reads)
- Field-anchored comments (create, list, delete, list unresolved)
- Audit subscriptions with diff-based "what changed?" summaries
- Approval workflow (submit for review, approve, list pending)
- Image upload/download
- Vulnerability library management (read, create, update, delete, promote finding → library)
- Draft findings from rough notes (Jaccard similarity against the library)

---

## Requirements

- Node.js 20 or later
- A running PwnDoc instance (self-hosted)
- A PwnDoc API key (`Profile → API keys → Create`)

---

## Configuration

All configuration is done through environment variables passed to the MCP server process.

| Variable | Required | Description |
|----------|----------|-------------|
| `PWNDOC_URL` | **yes** | Base URL of your PwnDoc instance, e.g. `https://pwndoc.company.tld` |
| `PWNDOC_API_KEY` | **yes** | API key from PwnDoc (`pwndoc_<64 hex chars>` format) |
| `PWNDOC_INSECURE_TLS` | no | Set to `1` to skip TLS certificate verification (useful for self-signed internal certs) |
| `PWNDOC_MCP_STATE_DIR` | no | Override the state directory (default: `~/.pwndoc-mcp/`) |

**State files** (`current.json`, `subscriptions.json`, snapshots) are written to `~/.pwndoc-mcp/` with mode `0600` (directory `0700`). They persist your current audit selection and subscription baselines across sessions.

---

## Installation & Running

### Option 1: npx from npm (recommended — no install needed)

Once published to npm, anyone can run the server without cloning anything:

```bash
npx pwndoc-mcp
```

The `npx` command downloads, builds (via the `prepare` hook), and runs the server in one step. Pass environment variables inline:

```bash
PWNDOC_URL=https://pwndoc.company.tld \
PWNDOC_API_KEY=pwndoc_0123... \
PWNDOC_INSECURE_TLS=1 \
npx pwndoc-mcp
```

Or add it directly to your MCP client config (see below) — the client handles the env vars.

### Option 2: Run from source (local dev / contributing)

```bash
git clone https://github.com/mrlsecurity/pwndoc-mcp.git
cd pwndoc-mcp
npm install
npm run build       # compiles TypeScript → dist/
```

Run the compiled server:

```bash
PWNDOC_URL=https://pwndoc.company.tld \
PWNDOC_API_KEY=pwndoc_0123... \
node dist/server.js
```

For hot-reload during development (no build step):

```bash
npm run dev
```

Run tests:

```bash
npm test            # vitest unit tests (no PwnDoc instance needed)
```

### Option 3: Docker (from source)

The included `Dockerfile` uses a multi-stage build: deps → compile → unit-test → runtime. The final image is minimal (no dev dependencies, no source files).

**Build and run:**

```bash
docker build --target runtime -t pwndoc-mcp .
docker run --rm -i \
  -e PWNDOC_URL=https://pwndoc.company.tld \
  -e PWNDOC_API_KEY=pwndoc_0123... \
  -e PWNDOC_INSECURE_TLS=1 \
  -e PWNDOC_MCP_STATE_DIR=/state \
  -v pwndoc-mcp-state:/state \
  pwndoc-mcp
```

The `-i` flag keeps stdin open (required for MCP stdio transport). The named volume persists state between container restarts.

**Build + run unit tests before producing the runtime image:**

```bash
docker build --target test -t pwndoc-mcp:test .
# Fails fast if any unit test fails — exit code non-zero.
```

**Run the npm audit check stage:**

```bash
docker build --target audit -t pwndoc-mcp:audit .
# Fails if any high/critical CVE is found in the dependency tree.
```

**Using docker compose:**

```bash
# Build and run unit tests
docker compose run --rm build-and-test

# Audit dependencies
docker compose run --rm audit

# Run the runtime server (reads PWNDOC_URL etc. from your shell or .env)
PWNDOC_URL=https://pwndoc.company.tld \
PWNDOC_API_KEY=pwndoc_0123... \
docker compose up runtime
```

---

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Using npx (no local install required):**

```json
{
  "mcpServers": {
    "pwndoc": {
      "command": "npx",
      "args": ["pwndoc-mcp"],
      "env": {
        "PWNDOC_URL": "https://pwndoc.company.tld",
        "PWNDOC_API_KEY": "pwndoc_0123456789abcdef...",
        "PWNDOC_INSECURE_TLS": "1"
      }
    }
  }
}
```

**Using a local build:**

```json
{
  "mcpServers": {
    "pwndoc": {
      "command": "node",
      "args": ["/absolute/path/to/pwndoc-mcp/dist/server.js"],
      "env": {
        "PWNDOC_URL": "https://pwndoc.company.tld",
        "PWNDOC_API_KEY": "pwndoc_0123456789abcdef...",
        "PWNDOC_INSECURE_TLS": "1"
      }
    }
  }
}
```

**Using Docker:**

```json
{
  "mcpServers": {
    "pwndoc": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "PWNDOC_URL",
        "-e", "PWNDOC_API_KEY",
        "-e", "PWNDOC_INSECURE_TLS",
        "-e", "PWNDOC_MCP_STATE_DIR=/state",
        "-v", "pwndoc-mcp-state:/state",
        "pwndoc-mcp"
      ],
      "env": {
        "PWNDOC_URL": "https://pwndoc.company.tld",
        "PWNDOC_API_KEY": "pwndoc_0123456789abcdef...",
        "PWNDOC_INSECURE_TLS": "1"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add pwndoc -- node /absolute/path/to/pwndoc-mcp/dist/server.js
```

Then set the env vars in `.claude/settings.json` or export them in your shell before running Claude Code.

### Dev mode (hot-reload, source changes reflected immediately)

```json
{
  "mcpServers": {
    "pwndoc": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/pwndoc-mcp/src/server.ts"],
      "env": {
        "PWNDOC_URL": "https://pwndoc.company.tld",
        "PWNDOC_API_KEY": "pwndoc_0123456789abcdef..."
      }
    }
  }
}
```

---

## First Use

1. In PwnDoc: **Profile → API keys → Create**. Name it (e.g. `claude-mcp`) and copy the one-time `pwndoc_<…>` value.
2. Set `PWNDOC_API_KEY` in your MCP client config and restart the MCP server.
3. Ask Claude: `pwndoc_whoami` — verifies the key works.
4. `list_my_audits` → find your audit → `set_current_audit` with that ID.
5. All tools now default to that audit. Pass `auditId` explicitly only when working on a different one.

To rotate the key: revoke the old one in the same UI panel and repeat step 1–2.

---

## Tool Reference

### Session
| Tool | Description |
|------|-------------|
| `pwndoc_whoami` | Return the authenticated user's profile |

### Current Audit
| Tool | Description |
|------|-------------|
| `set_current_audit` | Set the default audit for all subsequent tool calls |
| `get_current_audit` | Show which audit is currently selected |
| `list_my_audits` | List audits where the current user is a participant |

### Audit Reads
| Tool | Description |
|------|-------------|
| `get_audit_meta` | Return audit metadata (name, state, dates, participants) |
| `get_audit_scope` | Return the scope/targets defined on the audit |
| `list_findings` | List findings with slim projection (id, title, status, priority, category) |
| `audit_diff_since` | Diff current audit state against a stored snapshot |
| `get_audit_approvals` | Show current approval/review status |

### Audit Actions
| Tool | Description |
|------|-------------|
| `update_audit_field` | Update a top-level audit field (name, scope, dates, etc.) |

### Finding Reads
| Tool | Description |
|------|-------------|
| `get_finding` | Fetch a full finding |
| `get_finding_field` | Fetch a single field from a finding |
| `search_findings` | Full-text search across findings in the current audit |
| `list_vuln_library` | List vulnerability library entries (slim) |

### Finding Writes
| Tool | Description |
|------|-------------|
| `create_finding` | Create a new finding (only `title` required) |
| `update_finding_field` | Update a single field surgically (fetch-mutate-PUT) |
| `import_finding_from_library` | Copy a vuln library entry into the audit as a finding |
| `validate_finding` | Sanity-check a finding for required fields and CVSS (read-only) |
| `set_finding_status` | Toggle a finding between `done` (0) and `redacting` (1) |

### Comments
| Tool | Description |
|------|-------------|
| `list_comments` | List all comments on an audit or finding |
| `get_comment` | Fetch a single comment |
| `create_comment` | Create a new comment (field-anchored or general) |
| `delete_comment` | Delete a comment |
| `list_unresolved_comments` | Filter to unresolved comments only |

### Approvals
| Tool | Description |
|------|-------------|
| `submit_audit_for_review` | Move audit state to REVIEW |
| `approve_audit` | Approve the audit (reviewer role required) |
| `list_pending_reviews` | List all audits in REVIEW state where the current user is a reviewer |

### Subscriptions / What's New
| Tool | Description |
|------|-------------|
| `subscribe_audit` | Start tracking an audit; stores a slim baseline snapshot |
| `unsubscribe_audit` | Stop tracking; retains the snapshot |
| `subscribe_reviewable` | Auto-subscribe to all audits in REVIEW where you are a reviewer |
| `list_subscriptions` | Show all active subscriptions |
| `check_subscriptions` | Diff every subscribed audit against its baseline and report changes |

Ask Claude "what's new in PwnDoc?" — it calls `check_subscriptions` automatically.

### Support / Quality-of-Life
| Tool | Description |
|------|-------------|
| `list_clients` | List clients defined in PwnDoc (with optional substring filter) |
| `get_client` | Fetch one client by ID |
| `get_custom_field_schema` | Return custom-field definitions for findings or audits |
| `draft_finding_from_notes` | Scaffold a finding from rough notes (Jaccard similarity against the library) |
| `diff_findings` | Diff two findings field-by-field (useful for retest comparison) |
| `export_audit_summary` | Emit a compact markdown summary of all findings grouped by priority |
| `who_is_in_audit` | List users currently connected to the audit's collaborative session |

### Images
| Tool | Description |
|------|-------------|
| `upload_image` | Upload an image (file path, data URL, or base64) and get back the embed URL |
| `get_image` | Fetch image metadata by ID |
| `download_image` | Download image binary to local disk; returns the written path |
| `delete_image` | Delete an image (`confirm: true` required) |

### Vulnerability Library Writes
| Tool | Description |
|------|-------------|
| `create_vuln_library_entry` | Create a new shared library entry with localized details |
| `update_vuln_library_entry` | Update an existing entry (full details array required) |
| `delete_vuln_library_entry` | Delete a library entry (`confirm: true` required) |
| `promote_finding_to_library` | Copy a finding's reusable fields into the shared library |

---

## MCP Resources

Resources let Claude fetch full bodies on demand without paying for them in every tool response.

| URI | Returns |
|-----|---------|
| `pwndoc://audit/{auditId}` | Full audit object |
| `pwndoc://audit/{auditId}/finding/{findingId}` | Full finding object |
| `pwndoc://vuln-library` | Slim list of all library entries |
| `pwndoc://vuln-library/{vulnId}` | Full library entry |

---

## Token-Consumption Design

- Tool responses return slim projections by default. Pass `fields=[...]` to any read tool to restrict to only the fields you need.
- Snapshots used by `audit_diff_since` / `check_subscriptions` store only `{id, title, status, updatedAt}` per finding — never full bodies.
- Full audit and finding bodies are fetched lazily via MCP resources.

---

## Publishing to npm

To make the server callable via `npx pwndoc-mcp` without any local installation:

1. **Create an npm account** at [npmjs.com](https://www.npmjs.com/) if you don't have one.

2. **Login:**
   ```bash
   npm login
   ```

3. **Publish:**
   ```bash
   npm publish --access public
   ```
   The `prepare` script runs `npm run build` automatically before publishing, so `dist/` is always current.

4. **Anyone can now run it with:**
   ```bash
   npx pwndoc-mcp
   ```
   Or reference it directly in any MCP client config using `"command": "npx", "args": ["pwndoc-mcp"]`.

To publish under a scoped name (e.g. your org):
```bash
# In package.json, change "name" to "@yourscope/pwndoc-mcp"
npm publish --access public
# Users run: npx @yourscope/pwndoc-mcp
```

---

## Dependency Policy

All dependencies are pinned to exact versions. Before bumping any version:

1. Confirm the chosen version is at least 7 days old at install time.
2. Run `npm audit` and check [osv.dev](https://osv.dev) — no known unfixed CVEs.
3. Spot-check publisher health on [Socket.dev](https://socket.dev) or Snyk Advisor.
4. Commit `package-lock.json`.

---

## License

[Apache 2.0](LICENSE) — use freely, no restrictions.
