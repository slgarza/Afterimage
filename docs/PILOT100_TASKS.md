# A001-A100 implementation tasks

Source-reconciled against the retrieved design pack. See the [backlog guide](PILOT100_BACKLOG.md) and [decision/source register](DESIGN_RECONCILIATION.md).

Exactly 100 tasks: 11 ready for local implementation prerequisites and 89 blocked; 100 real issues linked. Live execution remains disabled.

| ID | Task | Status | Dependencies | Issue | Feature candidate |
| --- | --- | --- | --- | --- | --- |
| [A001](../swarm/tasks/A001.json) | Define canonical v1 match state, actions and invariants | ready | — | [#34](https://github.com/slgarza/Afterimage/issues/34) | yes |
| [A002](../swarm/tasks/A002.json) | Parse canonical v1 match intents without authority overrides | blocked | A001 | [#35](https://github.com/slgarza/Afterimage/issues/35) | yes |
| [A003](../swarm/tasks/A003.json) | Persist and replay full canonical matches with verified recovery | blocked | A001, A007, A024 | [#58](https://github.com/slgarza/Afterimage/issues/58) | yes |
| [A004](../swarm/tasks/A004.json) | Encode the six canonical incident matrices and semantic option keys | ready | — | [#36](https://github.com/slgarza/Afterimage/issues/36) | yes |
| [A005](../swarm/tasks/A005.json) | Cycle a seeded incident queue without immediate template repetition | blocked | A004 | [#37](https://github.com/slgarza/Afterimage/issues/37) | yes |
| [A006](../swarm/tasks/A006.json) | Assign exact roles and initial private Ghost Channel knowledge | blocked | A001 | [#38](https://github.com/slgarza/Afterimage/issues/38) | yes |
| [A007](../swarm/tasks/A007.json) | Initialize the canonical match from approved lobby configuration | blocked | A001, A004, A005, A006 | [#39](https://github.com/slgarza/Afterimage/issues/39) | yes |
| [A008](../swarm/tasks/A008.json) | Enforce rotating Shift Lead, cooldown, Jam and active-seat eligibility | blocked | A001 | [#40](https://github.com/slgarza/Afterimage/issues/40) | yes |
| [A009](../swarm/tasks/A009.json) | Record direct one-person Repair Crew votes under authority checks | blocked | A001, A008 | [#41](https://github.com/slgarza/Afterimage/issues/41) | yes |
| [A010](../swarm/tasks/A010.json) | Resolve top-two Crew votes using the canonical deterministic tie policy | blocked | A008, A009 | [#42](https://github.com/slgarza/Afterimage/issues/42) | yes |
| [A011](../swarm/tasks/A011.json) | Assign public Route and Gate operators with complementary diagnostics | blocked | A001, A004, A010 | [#43](https://github.com/slgarza/Afterimage/issues/43) | yes |
| [A012](../swarm/tasks/A012.json) | Lock each operator private Route or Gate choice | blocked | A001, A011 | [#44](https://github.com/slgarza/Afterimage/issues/44) | yes |
| [A013](../swarm/tasks/A013.json) | Resolve all Route–Gate pairs without random outcome decisions | blocked | A004, A011, A012 | [#45](https://github.com/slgarza/Afterimage/issues/45) | yes |
| [A014](../swarm/tasks/A014.json) | Derive replayable authority deadlines and persistent timer modifiers | blocked | A001 | [#46](https://github.com/slgarza/Afterimage/issues/46) | yes |
| [A015](../swarm/tasks/A015.json) | Complete missed votes, operations and power targets with audited seeded fallbacks | blocked | A008, A009, A010, A011, A012, A014, A025 | [#55](https://github.com/slgarza/Afterimage/issues/55) | yes |
| [A016](../swarm/tasks/A016.json) | Advance six-node tracks atomically and terminate exact win conditions | blocked | A001, A013 | [#47](https://github.com/slgarza/Afterimage/issues/47) | yes |
| [A017](../swarm/tasks/A017.json) | Apply all six incident-specific Anomaly consequences | blocked | A004, A014, A019, A022 | [#56](https://github.com/slgarza/Afterimage/issues/56) | yes |
| [A018](../swarm/tasks/A018.json) | Activate Trace Online for public pair classification after R2 | blocked | A001, A011, A013, A016 | [#48](https://github.com/slgarza/Afterimage/issues/48) | yes |
| [A019](../swarm/tasks/A019.json) | Consume Safeguard against exactly one future Jam or Disconnect | blocked | A001, A008, A016 | [#49](https://github.com/slgarza/Afterimage/issues/49) | yes |
| [A020](../swarm/tasks/A020.json) | Return recipient-private operation evidence through Audit Window | blocked | A001, A008, A011, A012, A016 | [#50](https://github.com/slgarza/Afterimage/issues/50) | yes |
| [A021](../swarm/tasks/A021.json) | Resolve once-per-match Containment with Null victory or permanent Disconnect | blocked | A008, A016, A019, A023 | [#52](https://github.com/slgarza/Afterimage/issues/52) | yes |
| [A022](../swarm/tasks/A022.json) | Apply sealed next-vote Signal Jam and one-round Grid Failure | blocked | A001, A008, A016, A019 | [#53](https://github.com/slgarza/Afterimage/issues/53) | yes |
| [A023](../swarm/tasks/A023.json) | Disconnect permanent spectators and apply Blackout timer danger | blocked | A001, A008, A014, A016, A019 | [#51](https://github.com/slgarza/Afterimage/issues/51) | yes |
| [A024](../swarm/tasks/A024.json) | Drive canonical rounds and semantic City Moments without client continuation gates | blocked | A001, A005, A007, A008, A010, A011, A013, A014, A015, A016, A017, A018, A019, A020, A021, A022, A023, A025 | [#57](https://github.com/slgarza/Afterimage/issues/57) | yes |
| [A025](../swarm/tasks/A025.json) | Project fair per-player observations and legal actions for humans and bots | blocked | A001, A006, A008, A011, A012, A018, A019, A020, A021, A022, A023 | [#54](https://github.com/slgarza/Afterimage/issues/54) | yes |
| [A026](../swarm/tasks/A026.json) | Build neutral-frost shell primitives and a genuinely blocking glass modal | ready | — | [#59](https://github.com/slgarza/Afterimage/issues/59) | no |
| [A027](../swarm/tasks/A027.json) | Implement temporary alias and avatar onboarding with an explicit picker | blocked | A026 | [#60](https://github.com/slgarza/Afterimage/issues/60) | yes |
| [A028](../swarm/tasks/A028.json) | Build Launch and the single-Play Home navigation | blocked | A026 | [#61](https://github.com/slgarza/Afterimage/issues/61) | yes |
| [A029](../swarm/tasks/A029.json) | Implement Solo setup with a five-to-ten player stepper | blocked | A026 | [#62](https://github.com/slgarza/Afterimage/issues/62) | yes |
| [A030](../swarm/tasks/A030.json) | Build the visible-lobby directory and code/passcode join flow | blocked | A026 | [#63](https://github.com/slgarza/Afterimage/issues/63) | yes |
| [A031](../swarm/tasks/A031.json) | Implement the blocking Create Lobby configuration modal | blocked | A026 | [#64](https://github.com/slgarza/Afterimage/issues/64) | yes |
| [A032](../swarm/tasks/A032.json) | Render the host-aware Lobby Room and its settings sheet | blocked | A026 | [#65](https://github.com/slgarza/Afterimage/issues/65) | yes |
| [A033](../swarm/tasks/A033.json) | Present the authoritative match-entry cinematic without advancing the game | blocked | A026 | [#66](https://github.com/slgarza/Afterimage/issues/66) | yes |
| [A034](../swarm/tasks/A034.json) | Implement hold-to-reveal private role and recipient-only Ghost information | blocked | A026 | [#67](https://github.com/slgarza/Afterimage/issues/67) | yes |
| [A035](../swarm/tasks/A035.json) | Bind versioned client state to local or multiplayer authority through one port | blocked | A001, A002, A025, A051, A054, A055, A056, A057, A077, A078 | [#76](https://github.com/slgarza/Afterimage/issues/76) | no |
| [A036](../swarm/tasks/A036.json) | Build the canonical six-node City Board with public operational player cards | blocked | A026 | [#77](https://github.com/slgarza/Afterimage/issues/77) | yes |
| [A037](../swarm/tasks/A037.json) | Submit one Repair Crew vote by directly tapping an eligible player card | blocked | A026 | [#78](https://github.com/slgarza/Afterimage/issues/78) | yes |
| [A038](../swarm/tasks/A038.json) | Present complementary private Route Operator and Gate Operator controls | blocked | A026 | [#79](https://github.com/slgarza/Afterimage/issues/79) | yes |
| [A039](../swarm/tasks/A039.json) | Show public resolution, operational profiles and imperfect evidence in sheets | blocked | A026 | [#80](https://github.com/slgarza/Afterimage/issues/80) | yes |
| [A040](../swarm/tasks/A040.json) | Stage all twelve City Moments from semantic events and return automatically | blocked | A026, A079, A091 | [#85](https://github.com/slgarza/Afterimage/issues/85) | yes |
| [A041](../swarm/tasks/A041.json) | Collect authoritative power targets and Containment votes in blocking modals | blocked | A026 | [#86](https://github.com/slgarza/Afterimage/issues/86) | yes |
| [A042](../swarm/tasks/A042.json) | Apply the silent-spectator presentation immediately after Disconnect | blocked | A026 | [#87](https://github.com/slgarza/Afterimage/issues/87) | yes |
| [A043](../swarm/tasks/A043.json) | Present Match End with full role reveal and explicit return routes | blocked | A026 | [#88](https://github.com/slgarza/Afterimage/issues/88) | yes |
| [A044](../swarm/tasks/A044.json) | Open a local Game Menu while the online match keeps running | blocked | A026 | [#89](https://github.com/slgarza/Afterimage/issues/89) | yes |
| [A045](../swarm/tasks/A045.json) | Implement Settings, Credits and platform purchase/privacy controls | blocked | A026 | [#90](https://github.com/slgarza/Afterimage/issues/90) | yes |
| [A046](../swarm/tasks/A046.json) | Build the achievement grid and blocking badge detail modal | blocked | A026 | [#91](https://github.com/slgarza/Afterimage/issues/91) | yes |
| [A047](../swarm/tasks/A047.json) | Teach the canonical round through a short interactive How to Play flow | blocked | A026 | [#92](https://github.com/slgarza/Afterimage/issues/92) | yes |
| [A048](../swarm/tasks/A048.json) | Connect the complete approved navigation and match journey in the actual App | blocked | A026, A027, A028, A029, A030, A031, A032, A033, A034, A035, A036, A037, A038, A039, A040, A041, A042, A043, A044, A045, A046, A047, A049, A050, A077, A079, A078 | [#99](https://github.com/slgarza/Afterimage/issues/99) | yes |
| [A049](../swarm/tasks/A049.json) | Handle reconnect, errors and leave without leaking or resurrecting private state | blocked | A026, A035 | [#93](https://github.com/slgarza/Afterimage/issues/93) | yes |
| [A050](../swarm/tasks/A050.json) | Bind UI semantics, preferences and the persistent banner dock through ports | blocked | A026, A079, A082, A083, A085, A088, A089, A091, A092 | [#98](https://github.com/slgarza/Afterimage/issues/98) | no |
| [A051](../swarm/tasks/A051.json) | Specify the supplied-design multiplayer transport and authority boundaries | ready | — | [#68](https://github.com/slgarza/Afterimage/issues/68) | no |
| [A052](../swarm/tasks/A052.json) | Bootstrap a provider-free authoritative service workspace | blocked | A051 | [#100](https://github.com/slgarza/Afterimage/issues/100) | no |
| [A053](../swarm/tasks/A053.json) | Bind an invisible verified session to a player independently of alias | blocked | A051, A052 | [#101](https://github.com/slgarza/Afterimage/issues/101) | yes |
| [A054](../swarm/tasks/A054.json) | Validate versioned lobby and Rules v1 service requests | blocked | A001, A002, A051, A078 | [#70](https://github.com/slgarza/Afterimage/issues/70) | yes |
| [A055](../swarm/tasks/A055.json) | Keep service failures fixed and free of private room information | ready | — | [#71](https://github.com/slgarza/Afterimage/issues/71) | yes |
| [A056](../swarm/tasks/A056.json) | Decode versioned lobby and match views at the transport boundary | blocked | A001, A002, A051, A078 | [#72](https://github.com/slgarza/Afterimage/issues/72) | yes |
| [A057](../swarm/tasks/A057.json) | Project public lobby and opt-in directory entries without secrets | blocked | A051, A056, A078 | [#73](https://github.com/slgarza/Afterimage/issues/73) | yes |
| [A058](../swarm/tasks/A058.json) | Provide atomic versioned room transactions and a memory repository | blocked | A001, A051, A052 | [#102](https://github.com/slgarza/Afterimage/issues/102) | yes |
| [A059](../swarm/tasks/A059.json) | Make actor and host requests idempotent across ambiguous retries | blocked | A054, A055, A058 | [#103](https://github.com/slgarza/Afterimage/issues/103) | yes |
| [A060](../swarm/tasks/A060.json) | Check revision and authoritative phase deadlines inside transactions | blocked | A001, A014, A055, A058 | [#104](https://github.com/slgarza/Afterimage/issues/104) | yes |
| [A061](../swarm/tasks/A061.json) | Create configured lobbies with private passcodes and unique room codes | blocked | A051, A053, A054, A055, A057, A058, A059 | [#105](https://github.com/slgarza/Afterimage/issues/105) | yes |
| [A062](../swarm/tasks/A062.json) | Join by code or an opt-in lobby directory without bypassing passcodes | blocked | A051, A053, A054, A055, A057, A058, A059, A061 | [#106](https://github.com/slgarza/Afterimage/issues/106) | yes |
| [A063](../swarm/tasks/A063.json) | Apply lobby profile readiness and host-only settings safely | blocked | A051, A053, A054, A055, A057, A058, A059, A060 | [#107](https://github.com/slgarza/Afterimage/issues/107) | yes |
| [A064](../swarm/tasks/A064.json) | Recover temporary network sessions without undoing permanent Disconnect | blocked | A051, A053, A055, A058, A060 | [#108](https://github.com/slgarza/Afterimage/issues/108) | yes |
| [A065](../swarm/tasks/A065.json) | Advance expired multiplayer phases once with seeded deadline completion | blocked | A001, A003, A014, A015, A024, A051, A053, A054, A055, A058, A059, A060 | [#109](https://github.com/slgarza/Afterimage/issues/109) | yes |
| [A066](../swarm/tasks/A066.json) | Start the Rules v1 match atomically from the configured lobby | blocked | A001, A003, A006, A007, A008, A014, A051, A053, A054, A055, A058, A059, A060, A076, A078 | [#110](https://github.com/slgarza/Afterimage/issues/110) | yes |
| [A067](../swarm/tasks/A067.json) | Project phase-correct Route Gate Ghost and spectator recipient views | blocked | A001, A025, A051, A053, A055, A056, A057, A058, A078 | [#111](https://github.com/slgarza/Afterimage/issues/111) | yes |
| [A068](../swarm/tasks/A068.json) | Adapt atomic room storage to Firestore after the owner project gate | blocked | A051, A052, A058, A072 | [#113](https://github.com/slgarza/Afterimage/issues/113) | yes |
| [A069](../swarm/tasks/A069.json) | Verify invisible anonymous sessions through a gated Firebase adapter | blocked | A051, A052, A053, A072 | [#114](https://github.com/slgarza/Afterimage/issues/114) | yes |
| [A070](../swarm/tasks/A070.json) | Expose configured lobby directory and membership callable adapters | blocked | A051, A052, A057, A061, A062, A063, A064, A068, A069 | [#115](https://github.com/slgarza/Afterimage/issues/115) | yes |
| [A071](../swarm/tasks/A071.json) | Enforce private diagnostic sealed-vote and spectator access rules | blocked | A051, A052, A072 | [#116](https://github.com/slgarza/Afterimage/issues/116) | yes |
| [A072](../swarm/tasks/A072.json) | Bootstrap gated demo emulators and pinned provider adapter dependencies | blocked | A051, A052 | [#112](https://github.com/slgarza/Afterimage/issues/112) | no |
| [A073](../swarm/tasks/A073.json) | Publish monotonic recipient views with bounded backpressure and revocation | blocked | A051, A055, A056, A057, A058, A067 | [#117](https://github.com/slgarza/Afterimage/issues/117) | yes |
| [A074](../swarm/tasks/A074.json) | Apply crew votes operation choices and powers through authoritative transactions | blocked | A001, A002, A003, A008, A009, A010, A011, A012, A013, A016, A017, A018, A019, A020, A021, A022, A023, A024, A025, A051, A053, A054, A055, A058, A059, A060, A066, A078 | [#118](https://github.com/slgarza/Afterimage/issues/118) | yes |
| [A075](../swarm/tasks/A075.json) | Connect match callables deadline callbacks and recipient publication in emulators | blocked | A001, A002, A003, A035, A051, A052, A056, A065, A066, A067, A068, A069, A070, A071, A072, A073, A074, A076, A078 | [#119](https://github.com/slgarza/Afterimage/issues/119) | yes |
| [A076](../swarm/tasks/A076.json) | Implement fair seeded bot decisions from recipient-visible observations | blocked | A002, A025 | [#74](https://github.com/slgarza/Afterimage/issues/74) | yes |
| [A077](../swarm/tasks/A077.json) | Drive a complete offline Solo match through a local authority adapter | blocked | A003, A014, A015, A024, A025, A056, A076, A078 | [#75](https://github.com/slgarza/Afterimage/issues/75) | yes |
| [A078](../swarm/tasks/A078.json) | Publish stable workspace APIs while preserving the completed pilot interfaces | ready | — | [#69](https://github.com/slgarza/Afterimage/issues/69) | no |
| [A079](../swarm/tasks/A079.json) | Define the typed visual asset registry and validated semantic-key manifest | ready | — | [#81](https://github.com/slgarza/Afterimage/issues/81) | yes |
| [A080](../swarm/tasks/A080.json) | Integrate the approved 36 Route/Gate icons and six incident emblems | blocked | A004, A079 | [#120](https://github.com/slgarza/Afterimage/issues/120) | yes |
| [A081](../swarm/tasks/A081.json) | Integrate approved City Moment, avatar and working-logo assets | blocked | A079 | [#121](https://github.com/slgarza/Afterimage/issues/121) | yes |
| [A082](../swarm/tasks/A082.json) | Define semantic audio and haptic events with silent test adapters | ready | — | [#82](https://github.com/slgarza/Afterimage/issues/82) | yes |
| [A083](../swarm/tasks/A083.json) | Implement gesture-gated Web Audio scenes and safe playback disposal | blocked | A082, A085, A092 | [#95](https://github.com/slgarza/Afterimage/issues/95) | yes |
| [A084](../swarm/tasks/A084.json) | Add opt-in native haptic feedback through the platform adapter | blocked | A082, A085, A095 | [#123](https://github.com/slgarza/Afterimage/issues/123) | yes |
| [A085](../swarm/tasks/A085.json) | Persist accessibility, media and language preferences without creating an account | ready | — | [#83](https://github.com/slgarza/Afterimage/issues/83) | yes |
| [A086](../swarm/tasks/A086.json) | Define the 48-achievement catalogue against objective versioned match events | blocked | A024, A079 | [#124](https://github.com/slgarza/Afterimage/issues/124) | yes |
| [A087](../swarm/tasks/A087.json) | Reduce and migrate local achievement progress from verified session summaries | blocked | A024, A085, A086 | [#125](https://github.com/slgarza/Afterimage/issues/125) | yes |
| [A088](../swarm/tasks/A088.json) | Define ad and purchase ports with deterministic post-match eligibility | ready | — | [#96](https://github.com/slgarza/Afterimage/issues/96) | yes |
| [A089](../swarm/tasks/A089.json) | Reserve the adaptive banner dock across every free-app surface | blocked | A026, A088 | [#97](https://github.com/slgarza/Afterimage/issues/97) | yes |
| [A090](../swarm/tasks/A090.json) | Implement supplied native advertising, consent and Remove Ads adapters | blocked | A088, A089, A095 | [#126](https://github.com/slgarza/Afterimage/issues/126) | yes |
| [A091](../swarm/tasks/A091.json) | Coordinate twelve City Moments with bounded motion and semantic feedback | blocked | A016, A024, A079, A082, A085 | [#84](https://github.com/slgarza/Afterimage/issues/84) | yes |
| [A092](../swarm/tasks/A092.json) | Validate selected media provenance and derive Credits from approved manifests | blocked | A079 | [#94](https://github.com/slgarza/Afterimage/issues/94) | no |
| [A093](../swarm/tasks/A093.json) | Verify canonical rules with independent exhaustive engine fixtures | blocked | A003, A024, A025 | [#127](https://github.com/slgarza/Afterimage/issues/127) | no |
| [A094](../swarm/tasks/A094.json) | Add a reproducible local browser runner and synthetic port fixture | ready | — | [#128](https://github.com/slgarza/Afterimage/issues/128) | no |
| [A095](../swarm/tasks/A095.json) | Prepare guarded Capacitor web, iOS and Android development wrappers | blocked | A085, A088 | [#122](https://github.com/slgarza/Afterimage/issues/122) | no |
| [A096](../swarm/tasks/A096.json) | Gate emulator authority, privacy and deadline checks in CI | blocked | A065, A067, A068, A069, A070, A071, A072, A073, A074, A075 | [#129](https://github.com/slgarza/Afterimage/issues/129) | no |
| [A097](../swarm/tasks/A097.json) | Verify the complete offline Solo journey with real engine outcomes | blocked | A048, A050, A077, A091, A093, A094 | [#130](https://github.com/slgarza/Afterimage/issues/130) | no |
| [A098](../swarm/tasks/A098.json) | Verify multi-client gameplay, reconnect and silent spectator authority | blocked | A048, A050, A067, A075, A094, A096 | [#131](https://github.com/slgarza/Afterimage/issues/131) | no |
| [A099](../swarm/tasks/A099.json) | Verify modal focus, reserved ad space and accessible private-media feedback | blocked | A048, A050, A082, A085, A088, A089, A091, A094 | [#132](https://github.com/slgarza/Afterimage/issues/132) | no |
| [A100](../swarm/tasks/A100.json) | Implement bounded public match chat and reactions with spectator enforcement | blocked | A025, A026, A035, A048, A051, A053, A055, A056, A058, A059, A067, A068, A069, A071, A072, A075, A078 | [#133](https://github.com/slgarza/Afterimage/issues/133) | yes |

Feature classifications are proposals, not completed deliveries. Promote dependencies only after actual reviewed merges and clear named decisions only with recorded evidence.
