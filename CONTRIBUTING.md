# Contributing to materialililil

Thank you for your interest in contributing! This document provides guidelines
and information for contributors.

## Code of Conduct

Be respectful and constructive. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/dev-doshi/materialililil/issues)
   to avoid duplicates
2. Open a new issue with:
   - OS and version
   - App version (shown in the title bar or `Help > About`)
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots if applicable

### Suggesting Features

Open an issue with the `enhancement` label. Describe:
- What problem it solves
- Proposed solution
- Alternatives considered

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test locally: `pnpm dev:electron`
5. Run lint: `pnpm lint`
6. Build: `pnpm build`
7. Commit with a clear message
8. Push and open a PR

### Development Setup

```bash
# Clone the repo
git clone https://github.com/dev-doshi/materialililil.git
cd materialililil

# Install dependencies
pnpm install

# Run in development mode (Next.js + Electron)
pnpm dev:electron

# Or just the web version
pnpm dev
```

### Project Structure

```
materialililil/
├── electron/          # Electron main process
│   ├── main.js        # Main process entry point
│   └── preload.js     # Preload script (context bridge)
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── engine/        # Image processing algorithms
│   ├── lib/           # Utilities
│   ├── store/         # Zustand state management
│   └── types/         # TypeScript types and map definitions
├── public/            # Static assets
├── LICENSE            # MIT License
├── PRIVACY_POLICY.md  # Privacy Policy
├── TERMS_OF_SERVICE.md # Terms of Service
└── THIRD_PARTY_LICENSES.md # Third-party attributions
```

## Legal

By contributing, you agree that your contributions will be licensed under the
MIT License. You represent that you have the right to make the contribution.

If your contribution introduces a new third-party dependency, please:
1. Verify the license is compatible with MIT
2. Update `THIRD_PARTY_LICENSES.md` with the new dependency
