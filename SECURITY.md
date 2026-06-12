# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Extension 1.0.x | Yes |
| @byomsdk/sdk 0.2.x | Yes |
| Older releases | Best effort |

## Reporting a Vulnerability

**Do not open public GitHub issues for security vulnerabilities.**

Email security reports to the repository maintainer via GitHub private vulnerability reporting (if enabled) or open a **private** security advisory on:

https://github.com/indrasishbanerjee/BringYourModel/security/advisories

Include:

- Description of the issue and impact
- Steps to reproduce
- Affected component (extension vault, bridge, SDK, consent flow)
- Your environment (browser version, extension version)

We aim to acknowledge reports within **7 days** and provide a fix or mitigation plan within **30 days** for confirmed issues.

## Scope

In scope:

- Encrypted vault and passphrase handling
- Page ↔ extension bridge and origin validation
- Consent, grants, and budget enforcement
- SDK protocol validation and error handling

Out of scope:

- Third-party AI provider outages or billing
- User misconfiguration of provider API keys
- Social engineering against users

## Security documentation

See [docs/security.md](docs/security.md) for the technical threat model.
