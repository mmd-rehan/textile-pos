# Debugging Prompt Template

Use this template when asking AI to debug an issue.

```text
Bug title:

Observed behavior:

Expected behavior:

Steps to reproduce:
1. 
2. 
3. 

Domain affected:

Relevant docs to read first:
- docs/00-overview/business-rules-global.md
- docs/02-domains/<domain>/
- docs/06-ai/bugfix-rules.md

Logs/error message:

Affected files:

Database records involved:

Business impact:
- inventory affected: yes/no/unknown
- invoice affected: yes/no/unknown
- payment affected: yes/no/unknown
- ledger affected: yes/no/unknown
- audit affected: yes/no/unknown

Suspected root cause:

Do not assume:

Required fix behavior:

Tests required:

Output format:
1. Root cause analysis
2. Affected business rule
3. Fix plan
4. Code changes
5. Data correction if needed
6. Regression tests
7. Manual verification steps
8. Pending confirmations
```
