| id | description | expect | result | observed |
|---|---|---|---|---|
| S01 | problem 2x+3=11: '2x=8' accepted (correct undo-add) | pass | PASS | verified |
| S02 | problem 2x+3=11: 'x=4' accepted and reaches the goal | pass | PASS | complete |
| S03 | official step list holds ONLY the two accepted lines | pass | PASS | 2x=8 → x=4 |
| S04 | no mis-logged lines when everything is correct | strip | STRIP | misLog=0 |
| S05 | sign error '2x=9' is NOT accepted | strip | STRIP | invalid |
| S06 | the wrong line is absent from the official step list | strip | STRIP | steps=[x=4] |
| S07 | the wrong line IS logged internally (Phase-2 stuck-detection fuel) | pass | PASS | misLog=[2x=9] |
| S08 | student keeps working after the wrong line; correct continuation still accepted | pass | PASS | complete |
| S09 | method A (2x=8 then x=4) fully accepted | pass | PASS | A: verified,complete |
| S10 | method B (different undo order) fully accepted — no single path enforced | pass | PASS | B: verified,verified,complete |
| S11 | both methods converge to the same goal and both work | pass | PASS | A-L=2 B-L=3 |
| S12 | simplify via expand: (x+2)(x+3) → x^2+5x+6 accepted | pass | PASS | complete |
| S13 | simplify via factorise (reverse direction) also accepted — multi-method | pass | PASS | complete |
| S14 | latency: 200 full solves (400 engine checks) → 97.4 ms total | pass | PASS | 0.2434 ms avg |
| S15 | single-commit latency under 400 ms (instant feel) | pass | PASS | c1=7.245ms c2=1.157ms |

**Phase-1 acceptance: 15 rows — 12 pass, 3 stripped (engine-strict), 0 fail.**
