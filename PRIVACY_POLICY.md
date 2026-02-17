# Privacy Policy

**Last updated:** February 17, 2026
**Effective date:** February 17, 2026
**Version:** 1.0.0

## Overview

materialililil ("the Application") is a desktop application for generating
PBR (Physically Based Rendering) texture maps from images. It is developed
and maintained by Dev Doshi ("we", "us", "our").

**materialililil processes all data locally on your device. We do not operate
any servers, and no data leaves your computer through our software.**

## Data Controller

For the purposes of the EU General Data Protection Regulation (GDPR) and
similar data protection laws:

- **Name:** Dev Doshi
- **Email:** devdoshi@hotmail.com

## What Data We Collect

**We do not collect any personal data.** Specifically:

- ❌ No user accounts or registration
- ❌ No analytics or telemetry
- ❌ No cookies (the app is not a website)
- ❌ No tracking pixels or advertising
- ❌ No crash reports sent to us
- ❌ No usage statistics
- ❌ No IP address logging
- ❌ No fingerprinting

## Data Processing

All image processing happens **entirely on your device**:

- Source images you import are processed in-memory using your device's CPU
- Generated texture maps are stored in your device's memory only
- Exported files are saved to locations you choose on your local filesystem
- Project data (if you use the save feature) is stored in your browser's
  localStorage or Electron's local storage — it never leaves your device

## Auto-Updates

The Application checks for updates via GitHub Releases:

- Your device makes HTTPS requests to `api.github.com` to check for new versions
- These requests are subject to [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- We do not receive, store, or process any information about these requests
- You can disable auto-updates by building the application from source
  with the updater disabled

## Third-Party Services

### GitHub (Microsoft Corporation)

The auto-update feature communicates with GitHub's API to check for new
releases. GitHub may log these API requests per their own privacy policy:

- **Service:** GitHub API (api.github.com)
- **Purpose:** Check for application updates; download new versions
- **Data sent:** Application version, operating system type
- **Privacy policy:** https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- **Data processing location:** United States
- **Legal basis (GDPR):** Legitimate interest (keeping software up to date)

### Google Fonts (Google LLC)

If you run the application in a web browser (non-Electron), fonts may be
loaded from Google's CDN on first page load. In the Electron desktop app,
fonts are bundled locally and no request to Google is made.

- **Service:** Google Fonts API (fonts.googleapis.com)
- **Purpose:** Load application typefaces
- **Privacy policy:** https://policies.google.com/privacy
- **Note:** In the desktop app, fonts are self-hosted — no external request is made

## Data Stored on Your Device

| Data | Location | Purpose | Your control |
|------|----------|---------|--------------|
| Saved projects | Electron localStorage | Persist your work between sessions | Clear via app or browser dev tools |
| Custom presets | Electron localStorage | Save your custom texture presets | Clear via app or browser dev tools |
| Application preferences | Electron localStorage | Remember your UI settings | Clear via app or browser dev tools |

All of this data is stored locally and is never transmitted.

## Your Rights Under GDPR

Even though we do not collect personal data, we respect your rights under
the GDPR and similar regulations. You have the right to:

1. **Right of Access (Art. 15):** Request information about data we process
   about you. Since we process no personal data, there is nothing to disclose.

2. **Right to Erasure (Art. 17):** Request deletion of your data. All data
   is stored locally on your device — you can delete it by uninstalling the
   application or clearing localStorage.

3. **Right to Data Portability (Art. 20):** Your data is already on your
   device in standard formats (PNG, JSON).

4. **Right to Object (Art. 21):** You can disable auto-updates by building
   from source.

5. **Right to Lodge a Complaint:** You may lodge a complaint with your local
   data protection authority.

## Children's Privacy

materialililil does not knowingly collect any data from children under 13
(or the applicable age in your jurisdiction). Since we collect no data at
all, there is no age-gated data processing.

## International Data Transfers

We do not transfer any data internationally. The only external network
request (auto-update check to GitHub) is subject to GitHub's own data
processing agreements. GitHub is certified under the EU-US Data Privacy
Framework.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be:

- Included in a new application version
- Noted in the release notes
- Reflected by updating the "Last updated" date at the top

The version number of this policy is tracked. Major changes that affect
your rights will be communicated through an in-app notice after an update.

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-17 | Initial privacy policy |

## Data Protection Officer

Given the nature of our data processing (none), we have not appointed a
Data Protection Officer. For any privacy-related questions, contact:

- **Email:** devdoshi@hotmail.com
- **Subject line:** materialililil Privacy Inquiry

## Legal Basis for Processing (GDPR Art. 6)

| Processing activity | Legal basis | Notes |
|---------------------|-------------|-------|
| Local image processing | N/A — no data leaves device | Not subject to GDPR |
| localStorage persistence | N/A — no data leaves device | Not subject to GDPR |
| Auto-update check | Legitimate interest (Art. 6(1)(f)) | Keeping software secure and up to date |

## California Privacy Rights (CCPA)

If you are a California resident, the California Consumer Privacy Act (CCPA)
provides you with specific rights. Since we do not collect, sell, or share
personal information, there is no data to access, delete, or opt out of selling.

## Contact

For any questions about this Privacy Policy, contact:

**Dev Doshi**
Email: devdoshi@hotmail.com
