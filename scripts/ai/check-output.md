| id | category | description | expect | result | observed |
|---|---|---|---|---|---|
| A01 | solve | 2x+3=11 → x:['4'] passes (verbatim) | pass | PASS | x=4 |
| A02 | solve | 2x+3=11 → x:['4 '] trailing space: engine compares verbatim → NOT confirmed | strip | STRIP | x=4  no-trim |
| A03 | solve | 2x+3=11 → x:[' x=4 '] equal-notation/spaces: not a bare integer → stripped | strip | STRIP | x=4 notation no |
| A04 | solve | 2x+3=11 → x:['5'] WRONG is rejected | strip | STRIP | x=5 reject |
| A05 | solve | 4x=3 → x:['3/4'] fraction: verifySolveRoots is integer-only → NOT confirmed | strip | STRIP | x=3/4 int-only |
| A06 | solve | 4x=3 → x:['0.75'] decimal: integer-only verifier → NOT confirmed | strip | STRIP | x=0.75 decimal no |
| A07 | solve | 4x=3 → x:['75%'] percentage NOT numeric → rejected | strip | STRIP | 75% reject |
| B01 | simplify | (x+2)(x+3) → x^2+5x+6 expanded (factorised input ok) | pass | PASS | expanded ok |
| B02 | simplify | x^2+5x+6 → (x+2)(x+3) factorised (reverse direction ok) | pass | PASS | factorised ok |
| B03 | simplify | (x+2)(x+3) → (x+2)(x+3) itself (idempotent) | pass | PASS | same form ok |
| B04 | simplify | with spaces:  ( x + 2 ) ( x + 3 )  → x^2+5x+6 | pass | PASS | spaces ok |
| B05 | simplify | WRONG: (x+2)(x+3) → x^2+7x+6 rejected | strip | STRIP | x^2+7x+6 reject |
| C01 | verifyPracticeItem | valid solve practice item re-verifies | pass | PASS | solve ok |
| C02 | verifyPracticeItem | valid simplify practice item re-verifies | pass | PASS | simplify ok |
| C03 | verifyPracticeItem | broken-solve item with wrong root is NOT engine-verified | strip | STRIP | x=7 reject |
| D01 | checkStudentAnswer | student 'x=4' for 2x+3=11 accepted | pass | PASS | x=4 ok |
| D02 | checkStudentAnswer | student 'x=9' for 2x+3=11 rejected | strip | STRIP | x=9 reject |
| D03 | checkStudentAnswer | student 'x=' (no value) rejected | strip | STRIP | x= reject |
| D04 | checkStudentAnswer | student '' (empty) rejected | strip | STRIP | empty reject |
| D05 | checkStudentAnswer | student ' x = 4 ' spaces around accepted | pass | PASS | spaces ok |
| E01 | verifyWorkedExample | wonked example, all steps equivalent → no errors | pass | PASS | 0 errs |
| E02 | verifyWorkedExample | wonked example with a non-equivalent step → errors reported | strip | STRIP | 1 err |
| G01 | guard-input | real solve item root engine-verified BEFORE arming | pass | PASS | root ok |
| G02 | guard-input | salted item's WRONG root also engine-checked (must be false) | pass | PASS | root7 != ok |
| G03 | guard | guard STRIPS the question whose key the engine cannot confirm | strip | STRIP | stripped=[salted-wrong-root] |
| G04 | guard | after strip the bad question is GONE (never saved/shown) | strip | STRIP | absent |

**Total 26 — 12 pass, 14 stripped, 0 fail.**
