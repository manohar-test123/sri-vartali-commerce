# Stonebridge Org Governance — Decision Record

Org: `manohar-test123` (Stonebridge) · Owner: `ManoharPaturi` (sole) · Members: 5
Decided: 2026-10-01 · Apply/change rules with: `./stonebridge-setup` (see header for usage)
Operator conduct: see `AGENTS.md` (binding) · change history: `AUDITLOG.md` (append-only)

## Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Repo visibility / plan | Private repos, **Free plan** *(revised 2026-10-02: owner declined Team; $0)* |
| 2 | Member contribution flow | **Read** access *(revised 2026-10-02)*: private fork → branch → PR; only the owner has write |
| 3 | Owner's own powers | **Escape hatch**: owner may push/merge directly; every bypass lands in the audit log |
| 4 | Repo lifecycle | **Only the owner** creates, deletes, or changes repo visibility |
| 5 | CODEOWNERS scope | **Everything**: `* @ManoharPaturi` — owner reviews every PR; formally *enforced* only on public repos (Free) |
| 6 | Approvals to merge | Owner review is the merge gate; member sign-off is an informal LGTM — read users can't formally approve on Free *(revised 2026-10-02)* |
| 7 | CI gate | Rule enabled, **no named checks yet**; add per repo via `--checks "ci,..."` (enforceable on public repos only while on Free) |
| 8 | Rule application | **Per-repo opt-in** — nothing auto-applies; run `protect <repo>` per repo |
| 9 | Merge method | **Squash only**; branch auto-deleted after merge |
| 10 | 2FA | **Required** for all org members |
| 11 | Outsiders | **Only the owner invites** outside collaborators (read-only) → they fork → PR |
| 12 | Starter pack | Org `.github` repo: CODEOWNERS, PR template, bug/feature issue templates, CONTRIBUTING |

## Folded-in defaults (stated, not separately asked)

- Squash-only merges with branch auto-delete on every repo (repo settings — work on Free).
- Force-push blocking, stale-review dismissal, conversation resolution apply via `protect`, which on Free is available for public repos only.
- Members cannot create teams; Dependabot alerts + security updates on for new repos.
- Org base permission: read (decision #2, revised 2026-10-02).

## How "only the owner merges" is enforced

By **permissions**, not branch protection: members have read access org-wide, so nobody but
the owner can push to or merge into any branch — there is nothing to bypass. Members
contribute from private forks (org-wide forking enabled) and the owner reviews and merges
every PR personally. Branch protection (2 approvals, code-owner review, push restrictions)
remains available for public repos via `protect`.

## Per-repo flexibility

On the Free plan, `protect` applies to **public repos** (or any repo if the org is ever upgraded):

- `./stonebridge-setup protect <repo> --approvals 1` — big client wants just your review
- `./stonebridge-setup protect <repo> --checks "ci,e2e"` — enforce CI once that repo has it
- `./stonebridge-setup protect <repo> --enforce-admins` — strictest mode, you lose the escape hatch on that repo
- Repo-level `.github/CODEOWNERS` overrides the org-wide file for selective ownership (e.g. docs exempt)

## Open items

- [x] `gh auth refresh -h github.com -s admin:org` — done 2026-10-02
- [x] Run `./stonebridge-setup init-org` — done 2026-10-02 (org settings + `.github` starter pack)
- [x] End-to-end test on sandbox repo — done 2026-10-02 on public `zz-freeplan-probe-pub` (verified: 2 approvals, code-owner review, owner-only push, escape hatch, squash-only)
- [x] Plan decision resolved 2026-10-02 — staying on **Free**; read + fork model adopted; org base permission set to `read` (verified; no per-repo grants exist)
- [ ] UI-only settings the script cannot set (owner, one time): require 2FA (Settings → Authentication security); Member privileges — no repo deletion, no visibility changes, no outside-collaborator invites, no team creation
- [ ] Sandbox test with one member: fork `zz-freeplan-probe` → branch → PR back (validates the Free-model flow end to end)
- [ ] Protect public/tooling repos on demand (`./stonebridge-setup protect <repo>`)
