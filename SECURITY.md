# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Current release |

## Reporting a Vulnerability

If you discover a security vulnerability in materialililil, please report it
responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. **Email:** devdoshi@hotmail.com
3. **Subject:** `[SECURITY] materialililil — <brief description>`
4. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 7 days
- **Fix (if applicable):** Best effort, typically within 30 days

## Scope

### In scope
- Electron main process security issues
- Preload script / context isolation bypasses
- Remote code execution via crafted images
- Prototype pollution or injection attacks
- Auto-updater integrity issues (e.g., update hijacking)

### Out of scope
- Issues requiring physical access to the user's device
- Denial of service (the app runs locally)
- Social engineering attacks
- Issues in third-party dependencies (report to upstream)

## Security Architecture

materialililil is designed with security in mind:

- **Context Isolation:** Enabled — renderer cannot directly access Node.js APIs
- **Sandbox:** Enabled — renderer runs in a sandboxed process
- **Node Integration:** Disabled — no direct Node.js access from web content
- **Preload Script:** Minimal surface area — only exposes version check and
  update status via `contextBridge`
- **No Remote Content:** The app loads only local static files (no remote URLs)
- **No Eval:** The app does not use `eval()` or `Function()` constructors
- **External Links:** Opened in the system default browser, not inside the app

## Auto-Update Security

- Updates are downloaded from GitHub Releases over HTTPS
- electron-updater verifies release signatures
- Update artifacts are signed with the repository owner's key
- The app checks `api.github.com` — no custom update server
