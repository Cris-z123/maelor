# Security Policy

## Supported Versions

We currently provide security updates for the following versions of this project:

| Version | Supported |
| ------- | --------- |
| Latest release | ✅ |
| Previous minor release | ✅ |
| Older releases | ❌ |
| Development / unreleased branches | Best effort |

If you are using an older release, please upgrade to the latest version before reporting a security issue unless the issue specifically prevents upgrading.

---

## Reporting a Vulnerability

If you believe you have found a **security vulnerability**, please **do not open a public GitHub Issue**.

Instead, please report it privately by contacting:

- **Security contact:** `cris.z12138123@gmail.com`

If possible, include the following information in your report:

- A clear description of the issue
- Steps to reproduce
- A proof of concept (PoC), if available
- The affected version / release
- Your environment:
  - Windows version
  - App version
  - Whether installed from installer / portable package
- Potential impact you believe the issue may cause

We will try to acknowledge receipt of your report within **7 days** and will make a best effort to investigate and address valid reports in a reasonable timeframe.

---

## Preferred Disclosure Process

Please follow **responsible disclosure**:

1. Report the issue privately first
2. Allow time for investigation and remediation
3. Avoid publicly disclosing exploit details until a fix or mitigation is available

This helps protect users while the issue is being addressed.

---

## What Qualifies as a Security Issue

Examples of security-relevant issues include, but are not limited to:

- Remote code execution (RCE)
- Arbitrary file read / write
- Privilege escalation
- Authentication or authorization bypass
- Token / credential leakage
- Sensitive local data exposure
- Insecure update or installer behavior
- Signature / package integrity bypass
- Unsafe Electron configuration that creates exploitable risk
- Command injection, path traversal, or deserialization vulnerabilities
- Cross-site scripting (XSS) that can impact app security
- Any issue that could allow attackers to execute unintended actions or access protected data

---

## Out of Scope / Not Usually Treated as Security Issues

The following are generally **not** considered security vulnerabilities unless they can be shown to create a meaningful exploit path:

- App crashes without a security impact
- UI bugs or layout issues
- General feature requests
- Performance issues
- Missing best practices without demonstrated exploitability
- Reports based only on outdated dependencies without a concrete exploit path
- Social engineering or phishing unrelated to the application itself
- Issues requiring local admin/system-level compromise first

If you are unsure whether something is security-related, feel free to report it privately anyway.

---

## Electron / Desktop App Notes

Because this project is a desktop application, the following areas are especially important from a security perspective:

- Update delivery and release integrity
- Code signing and installer trust
- Renderer / main process isolation
- Unsafe preload / IPC exposure
- Node.js integration and context isolation boundaries
- Storage of local secrets, tokens, or credentials
- Shell / command execution
- External link and protocol handling
- File system access and path handling

Reports affecting these areas are especially appreciated.

---

## Security Best Effort Statement

This project is maintained on a **best effort** basis.  
While we take valid security reports seriously, response and remediation timelines may vary depending on project capacity and severity.

---

## Thank You

We appreciate responsible security research and reports that help improve the safety of this project and its users.
