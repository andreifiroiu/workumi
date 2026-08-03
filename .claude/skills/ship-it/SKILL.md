---
name: ship-it
description: Finalize a Workumi change end-to-end — adversarial review of the whole feature, format, backend and frontend checks, conventional commit, and open a PR. Auto-invoke when the user says "ship it", "wrap this up", "finalize", "ready to commit/PR", "open a PR for this", or otherwise signals a feature/fix is done and should go out. Orchestrates the project's definition-of-done; do not skip steps.
---

# Ship it — Workumi definition of done

Take the current change from "code written" to "PR opened", running the project's
full finalize ritual. Work top to bottom. If a step surfaces a real problem,
**stop and report it** rather than pushing broken work.

## 0. Scope the feature
- Make sure you're on a feature branch, not `main`. If on `main`, branch first
  (`git switch -c <type>/<short-name>`).
- **Rebase or merge `origin/main` first.** This repo moves fast and parallel work
  lands directly on `main`. `git fetch origin` and check `git log HEAD..origin/main`
  before anything else — a conflicted PR cannot run CI at all, because
  `pull_request` workflows execute against a merge ref GitHub can't build.
- Determine the **full feature diff**, not just the last edit:
  `git diff origin/main...HEAD` plus staged/unstaged/untracked changes.

## 1. Adversarial review of the entire feature (do this first)
Review the complete diff with an **adversarial mindset — try to break it**, not to
praise it. Form hypotheses and **prove them with a failing test before fixing**;
a bug you can't reproduce may not be one. Prefer launching review subagents in
parallel (`pr-review-toolkit:code-reviewer`, `pr-review-toolkit:silent-failure-hunter`)
and consolidating findings. Note `/code-review` is user-triggered and billed — you
cannot launch it; suggest it if the change warrants that depth.

Hunt for the failure modes this codebase actually produces:

- **Team/project authorization.** Does the rule delegate to `Project::isVisibleTo` /
  `WorkOrder::isVisibleTo`, or does it *duplicate* the logic inline? Duplicated
  copies silently miss new access sources. Check child records (work orders, tasks,
  deliverables, documents, folders, lists) and both tiers from `ChecksTeamAccess`
  (`canWrite` excludes viewers; `canAdminister` is owner+admin).
- **The `team_user` pivot excludes the owner.** `User::createTeam()` deliberately
  skips it, so `Rule::exists('team_user', …)` rejects the team owner. Membership
  must go through `$team->allUsers()` or `belongsToTeam()`.
- **API/MCP vs web parity.** The REST API and MCP tools must never be more
  permissive than the app they front. Every new visibility rule needs applying at
  both, including parent lookups in Store requests.
- **Inertia shared props.** A null prop consumed unguarded in the layout chain
  white-screens *every* page. Check `HandleInertiaRequests`, and remember
  middleware ordering matters: Inertia computes shared props **before** calling
  `$next()`.
- **Inertia response types.** An Inertia XHR that redirects to a non-Inertia route
  (a Folio/Blade page) renders inside an error modal. Use `Inertia::location()`.
- **Silent failures** — swallowed exceptions, unguarded `$model->relation->prop`,
  soft-deleted parents returning `null` and dropping a guard, TOCTOU around unique
  constraints (catch `UniqueConstraintViolationException`).
- **Project conventions** — Form Requests over inline validation, explicit return
  types, `config()` not `env()` outside config, eager loading / N+1, Eloquent over
  `DB::`, Wayfinder helpers over hardcoded URLs in frontend code.
- **Test gaps** — happy path + failure path + a weird path.

Fix blocking issues (or surface them clearly if they need a decision). Re-review if
you changed anything substantive. Keep the consolidated findings — they go in the
PR body.

## 2. Format
Run `vendor/bin/pint --dirty --format agent`.

**Never run bare `pint --test`** — it reports ~130 files of pre-existing repo-wide
style debt that is not yours. To check only your work, guard against an empty file
list: given no paths, Pint scans the whole repo and you get that noise back.

```bash
FILES=$(git diff --name-only origin/main -- '*.php')
[ -n "$FILES" ] && vendor/bin/pint --test --format agent $FILES || echo "no PHP changed"
```

## 3. Backend tests (Pest)
- Run the affected tests by path or filter: `php artisan test --compact --filter=<Name>`.
- If nothing covers the change, **write a test first**, then run it. Feature tests
  by default; use factories and their custom states.
- Then run the **full suite** — this codebase's rules are cross-cutting and a policy
  change routinely breaks fixtures elsewhere: `php artisan test --compact`.
- Watch for fixtures that build users with `User::factory()` alone. Those users
  belong to no team, so anything team-scoped rejects them. Attach them to the team
  pivot with a role and set `current_team_id`. If `tests/Pest.php` has an
  `addTeamMember()` helper, use it; otherwise follow the pattern in
  `tests/Feature/Documents/DocumentIntegrationTest.php`.
- **All tests must pass.** If any fail, stop and report the output — do not commit.

## 4. Frontend checks (only if `resources/js` changed)
- `php artisan wayfinder:generate` **first** if you added or renamed routes —
  `resources/js/actions` is gitignored and generated, so imports won't resolve.
- `npm run types` (`tsc --noEmit`). There is a **pre-existing error baseline**, so a
  raw count means nothing. Diff the error *sets* against `main`:
  stash, run, unstash, run, `comm -13`. Zero new errors is the bar.
- `npx vitest run resources/js/<area>`. Some suites fail on `main` already — compare
  before claiming a regression.
- `npm run build` if you want the dev site to reflect the change.

## 5. Commit
Invoke the **`git-commit`** skill (Conventional Commits). Repo style:
- End the message with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
  — unlike some sibling projects, this repo **does** carry the trailer.
- Explain *why*, not just what. Good messages here name the wrong assumption that
  was fixed and any behaviour change that is not a no-op.
- Only commit already-staged files; don't `git add` for the user unless asked.

## 6. Open the PR
- Push: `git push -u origin <branch>`.
- `gh pr create --base main`. Always base on `main`; the repo squash-merges as
  `Title (#NN)`.
- **PR body**: short summary, then an **"Adversarial review"** section with the
  consolidated findings from step 1 — what was checked, what was fixed, and any
  residual risks or follow-ups you deliberately left out of scope. End with the
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)` footer.
- Return the PR URL.

## 7. Watch CI
Both `ci` and `quality` must pass. Use a Monitor with an until-loop rather than
polling. If `gh pr checks` reports *no checks at all*, the PR is almost certainly
conflicted — check `mergeable` before assuming CI is broken.

## Merging
**Do not merge unless the user asks.** `gh pr merge` is permission-gated in this
environment; if it is denied, stop and hand the decision back rather than routing
around it (e.g. by merging locally and pushing to `main`).

## Output
A short report: review verdict (what you tried to break, what actually broke, what
you fixed), pint result, backend test counts, frontend check results *relative to
the baseline*, commit subject, the PR URL, and CI status. State anything you
deliberately left out of scope, and any behaviour change that is not a no-op.
