# QA — Bug Log

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Test-Plan.md`, `Test-Cases.md`

Any dev can add or update a row here — this isn't gated behind QA. Link the failing `Test-Cases.md`
ID when there is one, so a fix can be traced back to what it re-validates.

`Severity`: `Blocker` (nothing ships until fixed) / `Critical` / `Major` / `Minor`.
`Status`: `Open` / `In Progress` / `Fixed — Pending Verify` / `Verified Closed`.

| ID | Summary | Test Case ID | Severity | Status | Reported By | Owner | Last Updated |
|---|---|---|---|---|---|---|---|
| BUG-001 | *(example row — delete once real entries exist)* Physical count variance shows negative % instead of clamping at 0 | S-01 | Minor | Open | — | — | — |

## Notes

- A `Blocker`/`Critical` bug tied to the current sprint's scope blocks that sprint's QA exit
  criteria (`Test-Plan.md` §4) — don't mark the sprint done with one of these still `Open`.
- When closing, move `Status` to `Fixed — Pending Verify` first; only the person who re-tests it
  (doesn't have to be the original reporter) flips it to `Verified Closed`. This keeps "the fix
  shipped" and "someone confirmed it works" as two separate, both-required steps.
