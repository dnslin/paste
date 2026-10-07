# Dependency audit snapshot

Date: 2026-10-07. Command: `pnpm audit --prod --json`. Registry advisory data is time-sensitive. Existing framework and library versions were retained in this feature branch; newly added Busboy 1.6.0 was not named by this run.

The audit reported 2 critical, 26 high, 16 moderate and 4 low package/advisory findings. These are dependency matches, not confirmed exploits in this application. A separate dependency review/update is required before deployment; this feature work did not perform a comprehensive reachability/security audit.

## Initial applicability notes

- Next 16.1.6 matches several App Router, middleware and image-optimizer advisories. This app uses App Router and `next/image`, so these need targeted review. File uploads are never served through the image optimizer. No exploit was executed.
- GHSA-p293-qw3h-jr36 is Windows-specific; the supplied Docker deployment is Linux. This reduces applicability to that deployment, not to every possible host.
- GHSA-2xp9-vwfh-vxw4 concerns AVIF image optimization. Existing UI images are repository assets and file attachments are private opaque downloads, but full optimizer endpoint reachability was not assessed.
- GHSA-gpj5-g38j-94v9 affects Drizzle identifier escaping. New queries use fixed schema identifiers and parameterized values; no untrusted identifier path was found in the new file feature. Existing application-wide reachability was not exhaustively audited.
- Source-map/build-time, non-secure/random-size generator and other findings likewise require checking the actual call paths; no blanket exploitability claim is made.

## Matched advisories

| Package / installed affected version(s) | Severity | Advisory | Patched range reported |
|---|---|---|---|
| next 16.1.6 | moderate | [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | >=16.1.7 |
| next 16.1.6 | moderate | [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | >=16.1.7 |
| next 16.1.6 | moderate | [GHSA-h27x-g6w4-24gq](https://github.com/advisories/GHSA-h27x-g6w4-24gq) | >=16.1.7 |
| next 16.1.6 | moderate | [GHSA-mq59-m269-xvcx](https://github.com/advisories/GHSA-mq59-m269-xvcx) | >=16.1.7 |
| next 16.1.6 | low | [GHSA-jcc7-9wpm-mj36](https://github.com/advisories/GHSA-jcc7-9wpm-mj36) | >=16.1.7 |
| drizzle-orm 0.45.1 | high | [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9) | >=0.45.2 |
| next 16.1.6 | high | [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | >=16.2.3 |
| postcss 8.4.31 | moderate | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | >=8.5.10 |
| next 16.1.6 | high | [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6) | >=16.2.6 |
| next 16.1.6 | low | [GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) | >=16.2.5 |
| next 16.1.6 | moderate | [GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) | >=16.2.5 |
| next 16.1.6 | low | [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949) | >=16.2.5 |
| next 16.1.6 | moderate | [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-mg66-mrh9-m8jx](https://github.com/advisories/GHSA-mg66-mrh9-m8jx) | >=16.2.5 |
| next 16.1.6 | moderate | [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-492v-c6pp-mqqv](https://github.com/advisories/GHSA-492v-c6pp-mqqv) | >=16.2.5 |
| next 16.1.6 | moderate | [GHSA-wfc6-r584-vfw7](https://github.com/advisories/GHSA-wfc6-r584-vfw7) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f) | >=16.2.5 |
| next 16.1.6 | high | [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) | >=16.2.5 |
| @babel/core 7.29.0 | low | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | >=7.29.1 |
| sharp 0.34.5 | high | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | >=0.35.0 |
| next 16.1.6 | high | [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) | >=16.2.11 |
| next 16.1.6 | high | [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | >=16.2.11 |
| next 16.1.6 | high | [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | >=16.2.11 |
| next 16.1.6 | moderate | [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) | >=16.2.11 |
| next 16.1.6 | moderate | [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) | >=16.2.11 |
| next 16.1.6 | moderate | [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | >=16.2.11 |
| next 16.1.6 | high | [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | >=16.2.11 |
| next 16.1.6 | moderate | [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) | >=16.2.11 |
| next 16.1.6 | moderate | [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | >=16.2.11 |
| postcss 8.4.31 | high | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | >=8.5.12 |
| postcss 8.4.31 | moderate | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | >=8.5.23 |
| nanoid 5.1.6 | high | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | >=5.1.16 |
| nanoid 3.3.11 | high | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | >=3.3.16 |
| nanoid 3.3.11 | high | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | >=3.3.18 |
| postcss 8.4.31 | high | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | >=8.5.18 |
| browserslist 4.28.1 | high | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | >=4.28.7 |
| browserslist 4.28.1 | high | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | >=4.28.7 |
| nanoid 5.1.6 | high | [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | >=5.1.11 |
| nanoid 3.3.11 | high | [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | >=3.3.12 |
| next 16.1.6 | critical | [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) | >=16.3.3 |
| baseline-browser-mapping 2.9.19 | moderate | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | >=2.11.0 |
| sharp 0.34.5 | high | [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | >=0.35.4 |
| next 16.1.6 | critical | [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | >=16.3.3 |
| source-map-js 1.2.1 | high | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | >=1.2.2 |
| sharp 0.34.5 | high | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | >=0.35.5 |
