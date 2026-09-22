| id | category | description | expect | result | observed |
|---|---|---|---|---|---|
| P01 | strip | fallback pack has >=8 practice with hidden_key present pre-strip | pass | PASS | keys=8 |
| P02 | strip | public pack: no practice item carries hidden_key | strip | PASS | sanitized |
| P03 | strip | public pack: serialized JSON contains no final_result anywhere | strip | PASS | no-leak |
| P04 | strip | public pack still carries license_flags for the UI banner | pass | PASS | flags ok |
| P05 | fallback | offline packs for 12 topics (incl. parent 'algebra' + sparse 'arithmetic') | pass | PASS | ok=12 fail=[] |
| P05b | fallback | unknown/off-curriculum slug returns null without throwing | pass | PASS | null ok |
| P06 | engine | every fallback practice key re-verifies with the real math engine | pass | PASS | ok=24 bad=0 |
| P07 | guard | guard keeps a clean pack unchanged | pass | PASS | stripped=[] |
| P08 | guard | guard STRIPS an item whose roots the engine cannot confirm | strip | STRIP | stripped=[p1] |
| P09 | guard | after strip the bad item is gone from the saved pack | strip | STRIP | absent |
| P10 | allowlist | openstax.org URL is allowlisted | pass | PASS | openstax ok |
| P11 | allowlist | gutenberg.org URL is allowlisted | pass | PASS | gutenberg ok |
| P12 | allowlist | pirate site is REJECTED | strip | STRIP | reject pirate |
| P13 | allowlist | random off-list host is REJECTED | strip | STRIP | reject offlist |
| P14 | validate | validateTopicPack accepts the fallback pack | pass | PASS | valid |
| P15 | validate | validateTopicPack rejects <8 practice items | strip | STRIP | reject 4 |
| P16 | validate | validateTopicPack rejects a final_result that disagrees with the engine | strip | STRIP | reject bad key |
| P17 | cache | store put/get + parseAndValidate round-trips a pack | pass | PASS | practice=8 |
| P18 | cache | source_hash is stored with the cached row | pass | PASS | hash present |

**Total 19 — 13 pass, 6 stripped, 0 fail.**
