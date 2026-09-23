# AgebypassX 2.4.1 simulated-browser validation

Run date: 2026-09-23. Environment: Windows, Node.js 24.14.0, jsdom 29.1.1.
Base: Saganaki22/AgebypassX commit `1921e34aed7b36e78d1d4511669e92a72a75acb7` (2.4.0).
The comparisons below use the same test suite against both script versions.

| Check | Result |
| --- | --- |
| Improved script, full simulated-browser suite | 29 passed, 0 failed |
| Original 2.4.0, same suite | 20 passed, 9 failed |
| JavaScript syntax | Passed |
| `git diff --check` | Passed |
| Clean `npm ci --ignore-scripts` | Passed |
| npm dependency audit during install | 0 reported vulnerabilities |

The nine tests failing on the original release cover deep-state stack overflow,
continuing past a revoked proxy, fetch-response feature arrays, prototype-name
false matches, early DOM mounting, missing document roots, stylesheet recovery,
container replacement, and stylesheet placement when a head appears later.

The suite executes the full userscript without exporting or modifying its private
functions. jsdom provides DOM events and MutationObserver behavior. A subclass of
Node's native Response provides JSON parsing, invalid-body rejection, receiver
validation, and consumed-body checks. One synthetic Response fixture exercises
cycles and shared references in the structural pre-scan.

Additional checks cover all six flags and their boolean/string/number forms;
20,000-level nesting; cyclic/shared state and repeated patches; existing initial
state; class/array/custom/null/cross-realm object targets; failed writes; throwing
getters; birthdate types; parse revivers; error recovery; persisted visibility;
and 1,000 nested timeline insertions without indicator-observer callbacks.

## Reproduce

```sh
npm ci --ignore-scripts
npm run check
npm test
```

To run against another userscript, set `AGEBYPASSX_TEST_SOURCE` to its file path
before running the tests. The GitHub Actions workflow runs the checks on Node 22
and 24 on pushes and pull requests. The results above are from the local Windows
run; remote workflow results are recorded separately in GitHub Actions.

## User-reported live smoke check

After the simulated tests, the user reported that 2.4.1 works on X and provided
console diagnostics showing ACTIVE status, zero recorded hook/traversal errors,
successful flag changes and no visible flag-write failures. This supports basic
live functionality in that session. It is not a controlled before/after test or
evidence of a speed improvement.

## Limits

- Automated validation did not use a live X account or userscript manager. The
  separate user-reported check above does not establish broad browser, account
  or regional compatibility. jsdom does not establish real-browser rendering
  or userscript injection behavior.
- The existing Response.json pre-scan still searches only five levels deep.
  Once a known marker matches, the full iterative patch has no depth cutoff.
- Traversal is synchronous and scales with the reachable object graph. Removing
  recursion prevents stack overflow, but does not impose a time or memory budget.
- No real-world scrolling-speed or anti-detection improvement is claimed.
