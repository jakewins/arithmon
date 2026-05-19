# Journal: STORY-0120 aardorn

## 2026-05-20 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- aardorn entry updated correctly: types ["normal"], shape varmint,
  catchRate 100 (matches upstream), 10 level-up techniques, evolution
  wired as `[{ species: "aardart", level: 18 }]`.
- aardart sprite is byte-identical to upstream.
- aardorn sprite is byte-identical to upstream.
- 4 new techniques (lickLash, hibernate, feint, tonguespear) match
  upstream accuracy/power/range/element with documented
  approximations (flinching/buff-strip/lifeleech).

**Defect:**
- aardart entry uses `catchRate: 100`, but upstream
  `aardart.yaml` has `catch_rate: 70.0`. See
  `todos/open/02-fix-aardart-catch-rate.md`.

Pre-commit gates and puppeteer evolution-QA deferred until the catch
rate fix lands.
