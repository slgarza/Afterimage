# Frozen controlled UI contracts for B001-B050

These fifty additional implementation tasks decompose the UI work already represented by A026-A050. They are independently implementable from the prepared source base, not fifty completed screens or a second count of those A features. They do not require an unmerged A/B implementation. After this cohort, integration must adapt the canonical authority/recipient data into these explicit view props and connect the actual App; A-series broad tasks must consume the corresponding reviewed leaves rather than reimplement them.

## Shared rules

- Each task owns exactly its `apps/client/src/pilot100/<module>/` directory. Export its component and the exact readonly `ComponentProps` interface from `index.tsx`; auxiliary local types are allowed. Tests and optional scoped CSS live there. Existing installed React, DOM and test tooling are sufficient. No new package, shared barrel, App import or sibling task implementation is required.
- Every type below is module-local and structural. `readonly` arrays/objects and callbacks are the integration boundary, not privileged raw engine state. Callback names request host actions; the view never makes a server/store/identity decision or claims an asynchronous action succeeded.
- All props are controlled unless an explicitly described ephemeral interaction (hold gesture/focus) requires local state. Tests must rerender with changed props, exercise invalid/unavailable inputs, and ensure no input mutation. No global random source, live network, private storage or engine timer is introduced.
- Icon/image props contain only caller-approved original media; missing media is an explicit unavailable placeholder with the same accessible label, not generated art, emoji or an A/B/C-only replacement. These coding tasks do not clear an asset-approval gate.
- Ordinary overlay leaves produce semantic content, not a second independent modal root. The integrator passes them as B050 overlay content. B050 owns complete-background inertness,blur/dim/desaturation,focus trapping/restoration and safe-area/dock composition. Thus B001-B049 do not depend on B050 to compile/test their content and do not falsely claim global modal acceptance alone.
- The supplied deadline/remainingSeconds is authority-relative view data. Local UI may format it but cannot advance gameplay, invent timeout actions,determine a match winner or restore permanent spectators. Null means unknown. Missing authority/provider/approved media remains unavailable.
- Module fixtures use synthetic public/recipient data. Hidden/private views fail closed even if an invalid caller passes private data while the visibility gate is false. No alignment,seed,private choice or passcode is rendered in hidden DOM,ARIA,data attributes or logs.
- The final check is `node tools/benchmark-pilot.mjs --profile full`. A passing module fixture is supporting acceptance evidence, not a merged green delivery, complete Solo game, real hundred-agent run or AFK comparison. Root workflow adds independent combined/application acceptance after actual integration.

## Export table

| Task | Module | Named export | A-series scope consumed later |
| --- | --- | --- | --- |
| [B001](../swarm/tasks/B001.json) | `apps/client/src/pilot100/launch` | `LaunchScreen` | A028 |
| [B002](../swarm/tasks/B002.json) | `apps/client/src/pilot100/alias-profile` | `AliasProfileEditor` | A027 |
| [B003](../swarm/tasks/B003.json) | `apps/client/src/pilot100/avatar-picker` | `AvatarPicker` | A027 |
| [B004](../swarm/tasks/B004.json) | `apps/client/src/pilot100/home-menu` | `HomeMenu` | A028 |
| [B005](../swarm/tasks/B005.json) | `apps/client/src/pilot100/solo-setup` | `SoloSetup` | A029 |
| [B006](../swarm/tasks/B006.json) | `apps/client/src/pilot100/lobby-directory` | `LobbyDirectory` | A030 |
| [B007](../swarm/tasks/B007.json) | `apps/client/src/pilot100/create-lobby` | `CreateLobbyForm` | A031 |
| [B008](../swarm/tasks/B008.json) | `apps/client/src/pilot100/join-code` | `JoinCodeForm` | A030 |
| [B009](../swarm/tasks/B009.json) | `apps/client/src/pilot100/lobby-header` | `LobbyHeader` | A032 |
| [B010](../swarm/tasks/B010.json) | `apps/client/src/pilot100/lobby-participants` | `LobbyParticipants` | A032 |
| [B011](../swarm/tasks/B011.json) | `apps/client/src/pilot100/lobby-settings` | `LobbySettingsForm` | A032 |
| [B012](../swarm/tasks/B012.json) | `apps/client/src/pilot100/private-reveal` | `PrivateRoleReveal` | A034 |
| [B013](../swarm/tasks/B013.json) | `apps/client/src/pilot100/match-header` | `MatchHeader` | A036 |
| [B014](../swarm/tasks/B014.json) | `apps/client/src/pilot100/player-table` | `PlayerCardTable` | A036, A037 |
| [B015](../swarm/tasks/B015.json) | `apps/client/src/pilot100/vote-feedback` | `VoteFeedback` | A037 |
| [B016](../swarm/tasks/B016.json) | `apps/client/src/pilot100/crew-announcement` | `CrewAnnouncement` | A036, A038 |
| [B017](../swarm/tasks/B017.json) | `apps/client/src/pilot100/route-operation` | `RouteOperation` | A038 |
| [B018](../swarm/tasks/B018.json) | `apps/client/src/pilot100/gate-operation` | `GateOperation` | A038 |
| [B019](../swarm/tasks/B019.json) | `apps/client/src/pilot100/operation-waiting` | `OperationWaiting` | A038 |
| [B020](../swarm/tasks/B020.json) | `apps/client/src/pilot100/round-resolution` | `RoundResolution` | A039 |
| [B021](../swarm/tasks/B021.json) | `apps/client/src/pilot100/anomaly-details` | `AnomalyDetails` | A039 |
| [B022](../swarm/tasks/B022.json) | `apps/client/src/pilot100/city-moment` | `CityMomentView` | A040, A091 |
| [B023](../swarm/tasks/B023.json) | `apps/client/src/pilot100/track-display` | `TrackDisplay` | A036 |
| [B024](../swarm/tasks/B024.json) | `apps/client/src/pilot100/player-details` | `PlayerDetails` | A039 |
| [B025](../swarm/tasks/B025.json) | `apps/client/src/pilot100/ghost-channel` | `GhostChannel` | A034, A039 |
| [B026](../swarm/tasks/B026.json) | `apps/client/src/pilot100/power-target` | `PowerTargetPrompt` | A041 |
| [B027](../swarm/tasks/B027.json) | `apps/client/src/pilot100/audit-result` | `AuditResult` | A039, A041 |
| [B028](../swarm/tasks/B028.json) | `apps/client/src/pilot100/status-details` | `StatusDetails` | A039, A042 |
| [B029](../swarm/tasks/B029.json) | `apps/client/src/pilot100/disconnect-prompt` | `DisconnectPrompt` | A041, A042 |
| [B030](../swarm/tasks/B030.json) | `apps/client/src/pilot100/spectator-view` | `SpectatorView` | A042 |
| [B031](../swarm/tasks/B031.json) | `apps/client/src/pilot100/match-end` | `MatchEnd` | A043 |
| [B032](../swarm/tasks/B032.json) | `apps/client/src/pilot100/results-roster` | `ResultsRoster` | A043 |
| [B033](../swarm/tasks/B033.json) | `apps/client/src/pilot100/game-menu` | `GameMenu` | A044 |
| [B034](../swarm/tasks/B034.json) | `apps/client/src/pilot100/settings` | `SettingsMenu` | A045, A085 |
| [B035](../swarm/tasks/B035.json) | `apps/client/src/pilot100/audio-settings` | `AudioSettings` | A045, A082, A085 |
| [B036](../swarm/tasks/B036.json) | `apps/client/src/pilot100/accessibility-settings` | `AccessibilitySettings` | A045, A085 |
| [B037](../swarm/tasks/B037.json) | `apps/client/src/pilot100/language-picker` | `LanguagePicker` | A045, A085 |
| [B038](../swarm/tasks/B038.json) | `apps/client/src/pilot100/credits` | `CreditsView` | A045, A092 |
| [B039](../swarm/tasks/B039.json) | `apps/client/src/pilot100/achievement-grid` | `AchievementGrid` | A046 |
| [B040](../swarm/tasks/B040.json) | `apps/client/src/pilot100/achievement-detail` | `AchievementDetail` | A046 |
| [B041](../swarm/tasks/B041.json) | `apps/client/src/pilot100/tutorial` | `HowToPlay` | A047 |
| [B042](../swarm/tasks/B042.json) | `apps/client/src/pilot100/reconnect` | `ReconnectOverlay` | A049 |
| [B043](../swarm/tasks/B043.json) | `apps/client/src/pilot100/error` | `ErrorOverlay` | A049 |
| [B044](../swarm/tasks/B044.json) | `apps/client/src/pilot100/leave-confirmation` | `LeaveConfirmation` | A044, A049 |
| [B045](../swarm/tasks/B045.json) | `apps/client/src/pilot100/match-entry` | `MatchEntryTransition` | A033 |
| [B046](../swarm/tasks/B046.json) | `apps/client/src/pilot100/banner-dock` | `BannerDock` | A089 |
| [B047](../swarm/tasks/B047.json) | `apps/client/src/pilot100/remove-ads` | `RemoveAdsControls` | A045, A088 |
| [B048](../swarm/tasks/B048.json) | `apps/client/src/pilot100/restore-purchases` | `RestorePurchases` | A045, A088 |
| [B049](../swarm/tasks/B049.json) | `apps/client/src/pilot100/shell-navigation` | `ShellNavigation` | A028, A048 |
| [B050](../swarm/tasks/B050.json) | `apps/client/src/pilot100/modal-viewport` | `ModalViewport` | A026, A048, A089 |

## B001 — LaunchScreen

Owned module: `apps/client/src/pilot100/launch/index.tsx`.

```ts
export interface LaunchScreenProps { readonly logo: { readonly src: string; readonly alt: string } | null; readonly reducedMotion: boolean; readonly entering: boolean; readonly onEnter: () => void; }
export function LaunchScreen(props: LaunchScreenProps): import('react').ReactElement;
```

Show Enter the signal as the only primary action with a quiet original working-title treatment. Missing approved logo/city media uses text and neutral atmosphere, never fabricated artwork. Entering disables repeated entry.

Independent acceptance:
- Enter emits exactly one callback and entering prevents repeats.
- The absent-art state has a readable working title and no broken image.
- Reduced motion removes decorative movement while preserving entry and accessible labels.

## B002 — AliasProfileEditor

Owned module: `apps/client/src/pilot100/alias-profile/index.tsx`.

```ts
export interface AliasProfileEditorProps { readonly alias: string; readonly avatarLabel: string; readonly error: string | null; readonly busy: boolean; readonly onAliasChange: (alias: string) => void; readonly onChooseAvatar: () => void; readonly onContinue: () => void; readonly onBack: () => void; }
export function AliasProfileEditor(props: AliasProfileEditorProps): import('react').ReactElement;
```

Implement the minimalist alias step with an editable controlled value, avatar-change action, accessible invisible labels and safe-area back control. The host owns validation/persistence; duplicate aliases remain permitted and no identity/login is introduced.

Independent acceptance:
- Typing emits the exact value without appending identity suffixes or changing the avatar.
- Tap to change requests the picker without rerolling alias or identity.
- Busy/error states suppress duplicate continuation and expose the provided error accessibly.

## B003 — AvatarPicker

Owned module: `apps/client/src/pilot100/avatar-picker/index.tsx`.

```ts
export interface AvatarPickerProps { readonly choices: readonly { readonly id: string; readonly label: string; readonly src: string | null }[]; readonly selectedId: string | null; readonly onSelect: (id: string) => void; readonly onClose: () => void; }
export function AvatarPicker(props: AvatarPickerProps): import('react').ReactElement;
```

Provide glass-overlay content with explicit named choices in a keyboard-operable single-selection list. Only callback IDs leave the component; no image generation, avatar download or alias mutation. Empty/unapproved media is honestly unavailable.

Independent acceptance:
- Pointer and keyboard choose only supplied IDs and identify the selected choice beyond colour.
- No choices yields a meaningful empty state with a working close action.
- Missing images preserve each accessible name without substitute artwork or broken-image UI.

## B004 — HomeMenu

Owned module: `apps/client/src/pilot100/home-menu/index.tsx`.

```ts
export interface HomeMenuProps { readonly mode: 'solo' | 'multiplayer'; readonly logo: { readonly src: string; readonly alt: string } | null; readonly onModeChange: (mode: 'solo' | 'multiplayer') => void; readonly onPlay: (mode: 'solo' | 'multiplayer') => void; }
export function HomeMenu(props: HomeMenuProps): import('react').ReactElement;
```

Render the near-black quiet Home with two accessible segmented mode options and one Play CTA. No gameplay city illustration, accounts, inventory or competing primary actions. Navigation is a separate composition slot supplied later.

Independent acceptance:
- Both mode options expose selected state and keyboard access.
- Play submits exactly the currently supplied mode rather than stale local state.
- Absent logo uses working-title text and no account/paywall/extra launch action.

## B005 — SoloSetup

Owned module: `apps/client/src/pilot100/solo-setup/index.tsx`.

```ts
export interface SoloSetupProps { readonly players: number; readonly difficulty: string; readonly difficulties: readonly { readonly id: string; readonly label: string }[]; readonly durationSeconds: number; readonly durations: readonly number[]; readonly readyToStart: boolean; readonly unavailableReason: string | null; readonly onPlayersChange: (players: number) => void; readonly onDifficultyChange: (id: string) => void; readonly onDurationChange: (seconds: number) => void; readonly onStart: () => void; readonly onBack: () => void; }
export function SoloSetup(props: SoloSetupProps): import('react').ReactElement;
```

Render a 5–10 stepper, supplied bot-difficulty and duration options and one Start simulation action. Explain that fair bots use the same rules/information as humans. Authority availability controls start; Firebase is not a prerequisite for Solo.

Independent acceptance:
- The stepper refuses less than5 and more than10 without altering other controlled values.
- Only supplied difficulty/duration IDs are emitted; no preset5/7/9 game modes are invented.
- Unavailable authority keeps Start disabled with the supplied reason, without fake demo wins or a Firebase demand.

## B006 — LobbyDirectory

Owned module: `apps/client/src/pilot100/lobby-directory/index.tsx`.

```ts
export interface LobbyDirectoryProps { readonly state: 'loading' | 'ready' | 'unavailable'; readonly entries: readonly { readonly id: string; readonly name: string; readonly connected: number; readonly capacity: number; readonly passcodeRequired: boolean; readonly joinable: boolean }[]; readonly onJoin: (id: string) => void; readonly onCreate: () => void; readonly onJoinByCode: () => void; readonly onRefresh: () => void; }
export function LobbyDirectory(props: LobbyDirectoryProps): import('react').ReactElement;
```

Render the directory directly on the background, not inside a giant parent card. Show capacity/lock indicators and Create lobby/Join with code routes. Supplied entries are already projected public data: never fetch rooms or request passcodes from this listing.

Independent acceptance:
- Ready-empty, loading and unavailable states remain distinct and navigable.
- Full/unjoinable entries cannot emit join requests; enabled entries emit their exact ID.
- No passcode value, private-room discovery or duplicate persistent logo is present in the DOM.

## B007 — CreateLobbyForm

Owned module: `apps/client/src/pilot100/create-lobby/index.tsx`.

```ts
export interface LobbyDraft { readonly name: string; readonly players: number; readonly roundSeconds: 30 | 60 | 90 | 120; readonly fillWithBots: boolean; readonly difficulty: string; readonly listed: boolean; readonly requirePasscode: boolean; readonly passcode: string; }
export interface CreateLobbyFormProps { readonly value: LobbyDraft; readonly difficulties: readonly { readonly id: string; readonly label: string }[]; readonly busy: boolean; readonly error: string | null; readonly onChange: (value: LobbyDraft) => void; readonly onCreate: () => void; readonly onClose: () => void; }
export function CreateLobbyForm(props: CreateLobbyFormProps): import('react').ReactElement;
```

Render the documented name,5–10 seats,30/60/90/120 round timer,bot-fill/difficulty,directory visibility and optional passcode inputs. This is overlay content only; callbacks request authority work and never synthesize a created room. Passcode text is ephemeral and never persisted/logged.

Independent acceptance:
- Seat and timer controls stay in the canonical ranges and preserve unrelated draft fields.
- Disabling requirePasscode hides the field and clears the passcode through onChange.
- Busy prevents duplicate creation and the supplied error is accessible without echoing passcode.

## B008 — JoinCodeForm

Owned module: `apps/client/src/pilot100/join-code/index.tsx`.

```ts
export interface JoinCodeFormProps { readonly code: string; readonly passcode: string; readonly passcodeRequired: boolean; readonly busy: boolean; readonly error: string | null; readonly onCodeChange: (code: string) => void; readonly onPasscodeChange: (passcode: string) => void; readonly onJoin: () => void; readonly onBack: () => void; }
export function JoinCodeForm(props: JoinCodeFormProps): import('react').ReactElement;
```

Present labelled code input, a password input only when authority requests it and one Join action. Treat code syntax/error messages as supplied authority state: do not guess normalization or use a backend. Do not store entered passcode or reveal existence beyond the supplied safe error.

Independent acceptance:
- A passcode challenge is hidden unless requested and uses a password input.
- Busy prevents repeated submissions while back remains available.
- Invalid/full/unavailable safe errors are rendered verbatim without exposing credentials or inventing successful joining.

## B009 — LobbyHeader

Owned module: `apps/client/src/pilot100/lobby-header/index.tsx`.

```ts
export interface LobbyHeaderProps { readonly name: string; readonly code: string; readonly connected: number; readonly capacity: number; readonly canCopy: boolean; readonly canShare: boolean; readonly feedback: string | null; readonly onCopy: () => void; readonly onShare: () => void; readonly onLeave: () => void; }
export function LobbyHeader(props: LobbyHeaderProps): import('react').ReactElement;
```

Render the public in-room code and connected/configured count with semantic copy/share actions. Host adapters own clipboard/share outcomes; the component must not call browser APIs or claim copying succeeded without feedback.

Independent acceptance:
- Only enabled copy/share controls emit requests and feedback is supplied rather than fabricated.
- Long room names/codes remain readable and controls carry accessible names.
- Counts remain connected/configured and never become role,passcode or hidden-identity summaries.

## B010 — LobbyParticipants

Owned module: `apps/client/src/pilot100/lobby-participants/index.tsx`.

```ts
export interface LobbyParticipantsProps { readonly participants: readonly { readonly id: string; readonly alias: string; readonly avatarLabel: string; readonly host: boolean; readonly ready: boolean; readonly bot: boolean; readonly canKick: boolean }[]; readonly openSeats: number; readonly fillWithBots: boolean; readonly canBegin: boolean; readonly onKick: (id: string) => void; readonly onBegin: () => void; }
export function LobbyParticipants(props: LobbyParticipantsProps): import('react').ReactElement;
```

Present avatar/alias,host,ready and bot statuses without secret alignments. Show distinct open-seat and bot-fill explanations. Supplied canKick/canBegin capabilities govern requests; this view never derives server authority or counts fake bots as connected humans.

Independent acceptance:
- Duplicate aliases remain distinct by ID/avatar and stable keys.
- Non-host/no-capability rows cannot kick; begin follows supplied authority permission.
- No role or passcode appears, and open seats have distinct bot-fill-disabled/enabled descriptions.

## B011 — LobbySettingsForm

Owned module: `apps/client/src/pilot100/lobby-settings/index.tsx`.

```ts
export interface LobbySettingsFormProps { readonly players: number; readonly roundSeconds: 30 | 60 | 90 | 120; readonly fillWithBots: boolean; readonly editable: boolean; readonly busy: boolean; readonly onPlayersChange: (players: number) => void; readonly onRoundSecondsChange: (seconds: 30 | 60 | 90 | 120) => void; readonly onFillWithBotsChange: (enabled: boolean) => void; readonly onSave: () => void; readonly onClose: () => void; }
export function LobbySettingsForm(props: LobbySettingsFormProps): import('react').ReactElement;
```

Provide a host-permission-controlled settings sheet body. Canonical player/timer ranges remain visible but read-only when editable=false, including after match start. Requests carry only updated values; no local authoritative countdown or server writes.

Independent acceptance:
- Read-only users can inspect/close but cannot emit configuration changes or Save.
- 5–10 players and30/60/90/120seconds are the only emitted configurations.
- Busy suppresses duplicate save; rendering updated supplied props replaces stale draft UI.

## B012 — PrivateRoleReveal

Owned module: `apps/client/src/pilot100/private-reveal/index.tsx`.

```ts
export interface PrivateRoleRevealProps { readonly revealedRole: 'archivist' | 'static-operative' | 'null' | null; readonly objective: string | null; readonly holdDurationMs: number; readonly canContinue: boolean; readonly onRevealRequest: () => void; readonly onContinue: () => void; }
export function PrivateRoleReveal(props: PrivateRoleRevealProps): import('react').ReactElement;
```

Implement pointer and keyboard hold-to-request revelation with cancellation on release/blur/cancel. Role/objective props stay absent from rendered DOM until a completed gesture; onRevealRequest asks the host for recipient data and never assigns roles. A role-null response is an honest wait. Clean timers on unmount.

Independent acceptance:
- Release,blur or pointer cancellation before the supplied threshold never requests/reveals a role.
- Completed keyboard/pointer hold emits one request, handles a delayed role prop and never renders another player’s alignment.
- Continue requires a revealed own role plus canContinue; hidden content does not leak through accessible labels or data attributes.

## B013 — MatchHeader

Owned module: `apps/client/src/pilot100/match-header/index.tsx`.

```ts
export interface MatchHeaderProps { readonly round: number; readonly shiftLeadAlias: string; readonly incidentTitle: string; readonly remainingSeconds: number | null; readonly urgent: boolean; readonly onOpenMenu: () => void; }
export function MatchHeader(props: MatchHeaderProps): import('react').ReactElement;
```

Render a quiet HUD with current round,Shift Lead,one incident and an injected remaining-time value. Component never calls a clock,advances phases or requests deadline resolution. Null time means awaiting authority; urgency uses text/icon as well as styling.

Independent acceptance:
- Countdown shows the supplied nonnegative value without an internal game timer or phase callback.
- Null deadline is distinct from zero/expired and does not claim advancement.
- Menu is labelled and urgency remains legible without colour/flashing or excessive live announcements.

## B014 — PlayerCardTable

Owned module: `apps/client/src/pilot100/player-table/index.tsx`.

```ts
export interface PlayerCardTableProps { readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarLabel: string; readonly operationalStatus: 'shift-lead' | 'route-operator' | 'gate-operator' | 'eligible' | 'cooldown' | 'jammed' | 'spectator'; readonly selectable: boolean }[]; readonly selectedId: string | null; readonly votingEnabled: boolean; readonly onVote: (id: string) => void; readonly onDetails: (id: string) => void; }
export function PlayerCardTable(props: PlayerCardTableProps): import('react').ReactElement;
```

Implement direct eligible card voting without Cast/Continue confirmation. Supplied operational statuses/capabilities are public projection,never secret roles. Detail action stays distinct from vote target and follows accessible touch/keyboard semantics.

Independent acceptance:
- Eligible enabled cards emit one ID on direct activation; spectators/cooldown/Jammed/disabled cards cannot vote.
- Selection is identified with text/ARIA plus neutral-frost styling,not colour alone.
- Duplicate aliases remain stable and no faction/secret information is accepted or inferred.

## B015 — VoteFeedback

Owned module: `apps/client/src/pilot100/vote-feedback/index.tsx`.

```ts
export interface VoteFeedbackProps { readonly state: 'not-cast' | 'pending' | 'recorded' | 'timeout-recorded' | 'unavailable'; readonly selectedAlias: string | null; readonly publicDrawExplanation: string | null; readonly message: string | null; }
export function VoteFeedback(props: VoteFeedbackProps): import('react').ReactElement;
```

Present authority-supplied local vote acknowledgement and optional public seeded-draw explanation. No voting control,second confirmation,public per-player secret vote breakdown or fabricated assignment. Keep pending separate from accepted.

Independent acceptance:
- Pending,recorded,timeout and unavailable states render distinct accessible status text.
- A null selected alias remains unknown rather than invented eligible selection.
- The supplied public draw explanation is shown without seed or a claim that Shift Lead broke a tie.

## B016 — CrewAnnouncement

Owned module: `apps/client/src/pilot100/crew-announcement/index.tsx`.

```ts
export interface CrewAnnouncementProps { readonly routeOperator: { readonly id: string; readonly alias: string }; readonly gateOperator: { readonly id: string; readonly alias: string }; readonly deploying: boolean; readonly reducedMotion: boolean; }
export function CrewAnnouncement(props: CrewAnnouncementProps): import('react').ReactElement;
```

Present the two publicly assigned Repair Crew operators and deployment status. Use distinct semantic role labels,not alignments. Optional contained movement follows reduced-motion preference and never becomes a phase gate.

Independent acceptance:
- Both assignments are labelled Route Operator/Gate Operator and preserve supplied identity order.
- Reduced motion removes deployment travel while preserving names and stage information.
- No private route/gate choice,diagnostic or alignment is derived or displayed.

## B017 — RouteOperation

Owned module: `apps/client/src/pilot100/route-operation/index.tsx`.

```ts
export interface RouteOperationProps { readonly incidentTitle: string; readonly choices: readonly { readonly id: string; readonly label: string; readonly icon: { readonly src: string; readonly alt: string } | null; readonly available: boolean }[]; readonly safeRouteId: string | null; readonly corruptedRouteId: string | null; readonly selectedId: string | null; readonly canChoose: boolean; readonly remainingSeconds: number | null; readonly onChoose: (id: string) => void; }
export function RouteOperation(props: RouteOperationProps): import('react').ReactElement;
```

Render private Route Operator content with three named route options and only route diagnostics. Approved icons are supplied; missing art is explicit unavailable media,not plaintext A/B/C substitutes or new images. Authority controls choice capabilities; no literal Repair/Sabotage buttons or gate diagnostics.

Independent acceptance:
- Only available choices emit their supplied IDs when canChoose=true; repeated/pending choices are prevented by updated props.
- Safe/corrupted route clues are visible only from supplied recipient data; missing diagnostics stay unknown.
- Named icon+label choices survive missing media/accessibility while no gate clue or outcome proof is invented.

## B018 — GateOperation

Owned module: `apps/client/src/pilot100/gate-operation/index.tsx`.

```ts
export interface GateOperationProps { readonly incidentTitle: string; readonly choices: readonly { readonly id: string; readonly label: string; readonly icon: { readonly src: string; readonly alt: string } | null; readonly available: boolean }[]; readonly safeGateId: string | null; readonly corruptedGateId: string | null; readonly selectedId: string | null; readonly canChoose: boolean; readonly remainingSeconds: number | null; readonly onChoose: (id: string) => void; }
export function GateOperation(props: GateOperationProps): import('react').ReactElement;
```

Render private Gate Operator content with three named gate options and only gate diagnostics. Approved icons are supplied; missing art stays honest. Do not reveal Route Operator clues/choice,render literal Repair/Sabotage controls or compute the public result.

Independent acceptance:
- Only available choices emit supplied IDs when enabled and expired/disabled content cannot submit.
- Safe/corrupted gate clues do not imply route clues or faction knowledge; absent clues remain unknown.
- Accessible named icon choices use no1/2/3-only substitute or unapproved image.

## B019 — OperationWaiting

Owned module: `apps/client/src/pilot100/operation-waiting/index.tsx`.

```ts
export interface OperationWaitingProps { readonly state: 'waiting-for-crew' | 'own-choice-submitted' | 'resolving' | 'unavailable'; readonly crewCompleted: number | null; readonly remainingSeconds: number | null; readonly message: string | null; }
export function OperationWaiting(props: OperationWaitingProps): import('react').ReactElement;
```

Render a noninteractive waiting view with supplied public completion count only. Do not expose another operator’s selection/diagnostic or simulate progress with timers. Essential stage descriptions remain textual.

Independent acceptance:
- All supplied stages remain distinct without a fake completion countdown.
- Unknown completion count/time remains unknown and does not claim which player submitted.
- No action controls,choice values,private clues or secret role status appear.

## B020 — RoundResolution

Owned module: `apps/client/src/pilot100/round-resolution/index.tsx`.

```ts
export interface RoundResolutionProps { readonly round: number; readonly outcome: 'repair' | 'sabotage' | 'anomaly'; readonly summary: string; readonly evidence: readonly { readonly id: string; readonly label: string; readonly detail: string }[]; readonly onEvidence: (id: string) => void; readonly onClose: () => void; }
export function RoundResolution(props: RoundResolutionProps): import('react').ReactElement;
```

Show the authority’s public resolution,board consequence copy and recipient-permitted evidence entries. Rendering never infers outcome from private choices or labels a crew member’s alignment. Close dismisses content only and never advances the round.

Independent acceptance:
- Repair,Sabotage and Anomaly have distinct labels independent of colour.
- Evidence actions emit only supplied IDs; an empty evidence array remains honest.
- No next-round/Continue gate or automatic faction deduction is introduced by closing.

## B021 — AnomalyDetails

Owned module: `apps/client/src/pilot100/anomaly-details/index.tsx`.

```ts
export interface AnomalyDetailsProps { readonly title: string; readonly description: string; readonly publicConsequence: string; readonly actions: readonly { readonly id: string; readonly label: string; readonly enabled: boolean }[]; readonly onAction: (id: string) => void; readonly onClose: () => void; }
export function AnomalyDetails(props: AnomalyDetailsProps): import('react').ReactElement;
```

Present only supplied authority-approved Anomaly effects and enabled action capabilities. The unresolved I04 target/timer composition remain authority questions; this view never chooses a policy or generates a target/seed. The caller owns whether closing is permitted.

Independent acceptance:
- Disabled actions never emit and valid actions emit exactly the supplied ID.
- Effects/counterplay are supplied text rather than guessed I04 or timer rules.
- Anomaly title and consequence remain readable with long text,reduced viewport and keyboard navigation.

## B022 — CityMomentView

Owned module: `apps/client/src/pilot100/city-moment/index.tsx`.

```ts
export interface CityMomentViewProps { readonly momentId: string; readonly title: string; readonly consequence: string; readonly icon: { readonly src: string; readonly alt: string } | null; readonly preset: 'rise-bloom' | 'scan-sweep' | 'shield-expand' | 'descend-impact' | 'fog-roll' | 'implosion' | 'signal-cut'; readonly reducedMotion: boolean; readonly endsMatch: boolean; }
export function CityMomentView(props: CityMomentViewProps): import('react').ReactElement;
```

Render a noninteractive City Moment treatment driven by a supplied semantic event. Preserve title/icon/consequence and quiet neutral chrome; use contained CSS animation with reduced-motion opacity fallback. Timing,semantic audio and returning to the board belong to the host authority/presentation coordinator,not confirmation buttons.

Independent acceptance:
- Changing a moment updates supplied content without inferring identity solely from score.
- Reduced motion preserves the event information with no shakes/flashes/travel.
- Missing approved icon is explicitly unavailable and there is no Continue button or invented match-end advancement.

## B023 — TrackDisplay

Owned module: `apps/client/src/pilot100/track-display/index.tsx`.

```ts
export interface TrackDisplayProps { readonly track: 'repair' | 'sabotage'; readonly value: number; readonly nodes: readonly { readonly node: 1 | 2 | 3 | 4 | 5 | 6; readonly title: string; readonly icon: { readonly src: string; readonly alt: string } | null; readonly consequenceActive: boolean }[]; readonly onNodeDetails: (node: 1 | 2 | 3 | 4 | 5 | 6) => void; }
export function TrackDisplay(props: TrackDisplayProps): import('react').ReactElement;
```

Render six labelled nodes as a supplied public projection with distinct reached/current/consequence states. It complements,never replaces,the City Moment event. Unexpected value/node data is visibly invalid rather than silently reverting to the old five-mark model.

Independent acceptance:
- Zero through six display exactly six labelled nodes and correct progress text.
- Reached/current/persistent consequence distinctions survive monochrome rendering and keyboard access.
- Out-of-range or duplicate/missing nodes do not fabricate valid progress or trigger win logic.

## B024 — PlayerDetails

Owned module: `apps/client/src/pilot100/player-details/index.tsx`.

```ts
export interface PlayerDetailsProps { readonly alias: string; readonly avatarLabel: string; readonly operationalStatus: string; readonly publicHistory: readonly { readonly id: string; readonly round: number; readonly description: string }[]; readonly onClose: () => void; }
export function PlayerDetails(props: PlayerDetailsProps): import('react').ReactElement;
```

Provide a detail sheet body using only public operational profile/history. No role field,secret seed,private diagnostic or verdict is accepted. Histories may legitimately be empty and duplicate aliases remain valid.

Independent acceptance:
- Empty history explicitly states no public entries and does not manufacture a previous operation.
- Long or repeated aliases/history are safely rendered as text without HTML injection.
- Closing emits dismissal only; no history item is styled as proof of secret alignment.

## B025 — GhostChannel

Owned module: `apps/client/src/pilot100/ghost-channel/index.tsx`.

```ts
export interface GhostChannelProps { readonly authorized: boolean; readonly allies: readonly { readonly id: string; readonly alias: string; readonly avatarLabel: string }[]; readonly onClose: () => void; }
export function GhostChannel(props: GhostChannelProps): import('react').ReactElement;
```

Show only the initial Static-operative ally list supplied by the recipient projection. authorized=false renders no ally identities,including hidden DOM/ARIA/data attributes. The Null is never inferred from absence; later Resonance remains deferred.

Independent acceptance:
- Unauthorized rendering reveals no supplied ally names/IDs even if the host mistakenly passes a nonempty array.
- Authorized empty/single/multiple lists remain distinct and use stable identity keys.
- No Null inference,Resonance candidates,server seed or role-discovery algorithm is introduced.

## B026 — PowerTargetPrompt

Owned module: `apps/client/src/pilot100/power-target/index.tsx`.

```ts
export interface PowerTargetPromptProps { readonly powerId: string; readonly title: string; readonly instruction: string; readonly targets: readonly { readonly id: string; readonly alias: string; readonly eligible: boolean; readonly reason: string | null }[]; readonly canAct: boolean; readonly pending: boolean; readonly onChoose: (id: string) => void; }
export function PowerTargetPrompt(props: PowerTargetPromptProps): import('react').ReactElement;
```

Provide a blocking power-target content view. Supplied eligible targets/capabilities determine interactivity. Do not resolve R5 thresholds,eligibility exhaustion or I04 targeting; empty targets are an explicit authority-unavailable state,not auto-selection. No dismiss action bypasses mandatory powers.

Independent acceptance:
- Only eligible targets emit requests while canAct=true and pending=false.
- An empty target set cannot submit or silently choose a player.
- Long reasons are accessible; no secret alignment inference or unapproved containment policy appears.

## B027 — AuditResult

Owned module: `apps/client/src/pilot100/audit-result/index.tsx`.

```ts
export interface AuditResultProps { readonly targetAlias: string; readonly result: 'safe' | 'corrupted' | 'neutral' | 'timeout' | null; readonly unavailableReason: string | null; readonly onClose: () => void; }
export function AuditResult(props: AuditResultProps): import('react').ReactElement;
```

Render the four specified operation categories without calling them secret alignments. Null result is unknown/unavailable with supplied explanation; this view does not resolve D-AUDIT-NO-HISTORY or invent a fifth canonical audit outcome.

Independent acceptance:
- Each known audit category has distinct text and never proves a faction.
- Null result with/without a reason stays unknown rather than safe or timeout.
- No private diagnostic/choice/raw audit record leaks through rendered attributes.

## B028 — StatusDetails

Owned module: `apps/client/src/pilot100/status-details/index.tsx`.

```ts
export interface StatusDetailsProps { readonly alias: string; readonly status: 'eligible' | 'cooldown' | 'jammed' | 'spectator'; readonly description: string; readonly onClose: () => void; }
export function StatusDetails(props: StatusDetailsProps): import('react').ReactElement;
```

Render a short operational status explanation using supplied description and canonical labels. Distinguish one-round cooldown/Jam from permanent silent spectator Disconnect. No client timer or inferred eligibility recalculation.

Independent acceptance:
- Cooldown and Jam are distinct from permanent spectator wording.
- Spectator presentation promises no vote,Crew,action,chat or reaction capability.
- Closing dismisses detail without restoring authority or changing player status.

## B029 — DisconnectPrompt

Owned module: `apps/client/src/pilot100/disconnect-prompt/index.tsx`.

```ts
export interface DisconnectPromptProps { readonly powerTitle: string; readonly targets: readonly { readonly id: string; readonly alias: string; readonly eligible: boolean }[]; readonly selectedId: string | null; readonly canAct: boolean; readonly pending: boolean; readonly onSelect: (id: string) => void; readonly onConfirm: (id: string) => void; }
export function DisconnectPrompt(props: DisconnectPromptProps): import('react').ReactElement;
```

Explain the permanent silent-spectator consequence and require an explicit target confirmation. The authority supplies targets and eligibility; no self-target/status override or alignment disclosure. Mandatory unresolved action has no close-to-skip route.

Independent acceptance:
- Only supplied eligible targets can be selected/confirmed when permitted.
- No selection or pending request disables confirmation and prevents duplicate destructive submission.
- The consequence is permanent spectator status,never logout,temporary presence or automatic faction reveal.

## B030 — SpectatorView

Owned module: `apps/client/src/pilot100/spectator-view/index.tsx`.

```ts
export interface SpectatorViewProps { readonly reason: string; readonly publicRound: number; readonly publicSummary: string; readonly onOpenMenu: () => void; }
export function SpectatorView(props: SpectatorViewProps): import('react').ReactElement;
```

Show a clear permanent spectator notice plus public round context and local-menu request. Deliberately accept no vote/operation/chat/reaction callbacks or secret-role fields; temporary network disconnect uses a different surface.

Independent acceptance:
- The view exposes no voting,Crew,power,chat or reaction action.
- It explains permanent silent observation without revealing a faction.
- Updating public round/summary changes observation content while keeping only the local menu interactive.

## B031 — MatchEnd

Owned module: `apps/client/src/pilot100/match-end/index.tsx`.

```ts
export interface MatchEndProps { readonly mode: 'solo' | 'multiplayer'; readonly winner: 'archivists' | 'static'; readonly reason: string; readonly canPlayAgain: boolean; readonly onAgain: () => void; readonly onReturn: () => void; readonly onExit: () => void; }
export function MatchEnd(props: MatchEndProps): import('react').ReactElement;
```

Implement Match End glass content with supplied winner/reason and explicit Again,Back to lobby or Back to Solo setup,and Exit game actions. Authority owns replay; no score-derived winner,ad SDK,purchase,or automatic navigation.

Independent acceptance:
- Solo and multiplayer return labels differ accurately and emit their own supplied callback.
- Again follows canPlayAgain; no action changes winner or starts an unverified match.
- Winner/reason are accessible independent of colour,and no interstitial appears inside the result view.

## B032 — ResultsRoster

Owned module: `apps/client/src/pilot100/results-roster/index.tsx`.

```ts
export interface ResultsRosterProps { readonly matchEnded: boolean; readonly players: readonly { readonly id: string; readonly alias: string; readonly role: 'archivist' | 'static-operative' | 'null' }[]; readonly rounds: readonly { readonly round: number; readonly outcome: 'repair' | 'sabotage' | 'anomaly'; readonly summary: string }[]; }
export function ResultsRoster(props: ResultsRosterProps): import('react').ReactElement;
```

Render the final full-role reveal and public ordered round timeline only when matchEnded=true. Fail closed before Match End even if props contain secrets. Empty results are unavailable rather than guessed from votes or outcomes.

Independent acceptance:
- matchEnded=false exposes none of the passed roles/names/timeline,including accessible attributes.
- Final duplicate aliases are stable by ID and all three canonical role labels are supported.
- An empty timeline or roster remains explicit unavailable data; original arrays are not sorted/mutated in place.

## B033 — GameMenu

Owned module: `apps/client/src/pilot100/game-menu/index.tsx`.

```ts
export interface GameMenuProps { readonly mode: 'solo' | 'multiplayer'; readonly onHowToPlay: () => void; readonly onSettings: () => void; readonly onLeave: () => void; readonly onClose: () => void; }
export function GameMenu(props: GameMenuProps): import('react').ReactElement;
```

Provide local glass-menu content for How to Play,Settings,Leave and Close. In multiplayer explicitly say that the game continues; there is no global pause action or clock suppression. Leaving requests a separate confirmation flow.

Independent acceptance:
- Multiplayer wording clearly states that the match continues and never offers Pause.
- Each action emits only its corresponding callback and close does not advance the match.
- Keyboard order and neutral glass styles preserve one clear exit route without background interactions owned by this leaf.

## B034 — SettingsMenu

Owned module: `apps/client/src/pilot100/settings/index.tsx`.

```ts
export interface SettingsMenuProps { readonly appearance: 'system' | 'dark' | 'light'; readonly languageLabel: string; readonly privacyAvailable: boolean; readonly purchaseAvailable: boolean; readonly onAppearanceChange: (value: 'system' | 'dark' | 'light') => void; readonly onAudio: () => void; readonly onAccessibility: () => void; readonly onLanguage: () => void; readonly onPrivacy: () => void; readonly onCredits: () => void; readonly onPurchases: () => void; readonly onClose: () => void; }
export function SettingsMenu(props: SettingsMenuProps): import('react').ReactElement;
```

Implement the supplied settings-category body with appearance controls,language,audio,accessibility,privacy,credits and purchases when available. It emits semantic navigation requests only; no storage,SDK,consent decision or unapproved URL is introduced.

Independent acceptance:
- Appearance emits exactly system/dark/light and no other preference is changed.
- Unavailable privacy/purchase capabilities have honest disabled/unavailable presentation.
- Every category has accessible text and emits the correct callback without opening arbitrary external URLs.

## B035 — AudioSettings

Owned module: `apps/client/src/pilot100/audio-settings/index.tsx`.

```ts
export interface AudioSettingsProps { readonly musicEnabled: boolean; readonly sfxEnabled: boolean; readonly hapticsEnabled: boolean; readonly musicVolume: number; readonly sfxVolume: number; readonly hapticsSupported: boolean; readonly onMusicEnabledChange: (value: boolean) => void; readonly onSfxEnabledChange: (value: boolean) => void; readonly onHapticsEnabledChange: (value: boolean) => void; readonly onMusicVolumeChange: (value: number) => void; readonly onSfxVolumeChange: (value: number) => void; readonly onClose: () => void; }
export function AudioSettings(props: AudioSettingsProps): import('react').ReactElement;
```

Render controlled semantic audio toggles and labelled0–1 volume controls; haptics unavailable is explicit. Do not autoplay,fake waveform playback,access native APIs,persist preferences or attach audio files.

Independent acceptance:
- Music/SFX toggles and volume callbacks remain independent and constrained to0–1.
- Unsupported haptics cannot emit an enable request and explain unavailability.
- Rendering/interaction never starts audio or bypasses gesture/system-mute restrictions.

## B036 — AccessibilitySettings

Owned module: `apps/client/src/pilot100/accessibility-settings/index.tsx`.

```ts
export interface AccessibilitySettingsProps { readonly reduceMotion: boolean; readonly systemReduceMotion: boolean; readonly onReduceMotionChange: (value: boolean) => void; readonly onClose: () => void; }
export function AccessibilitySettings(props: AccessibilitySettingsProps): import('react').ReactElement;
```

Provide the documented Reduce Motion preference with a clear supplied system-preference indicator and explanation that labels/state feedback remain. This controls intent only,not operating-system settings or unapproved accessibility modes.

Independent acceptance:
- The controlled toggle emits one boolean and does not mutate systemReduceMotion.
- System and selected settings are clearly distinguishable to assistive technology.
- Copy explains reduced decorative motion without promising to remove essential game feedback.

## B037 — LanguagePicker

Owned module: `apps/client/src/pilot100/language-picker/index.tsx`.

```ts
export interface LanguagePickerProps { readonly value: 'system' | 'es' | 'en'; readonly systemLanguageLabel: string; readonly onChange: (value: 'system' | 'es' | 'en') => void; readonly onClose: () => void; }
export function LanguagePicker(props: LanguagePickerProps): import('react').ReactElement;
```

Render the three documented language options with native labels and accessible single selection. A callback requests preference change; do not rewrite global DOM language,fetch translations or create an account.

Independent acceptance:
- System,Español and English are the only selectable emitted values.
- Keyboard selection updates through onChange and follows supplied controlled props.
- System-language label is readable text and is never interpreted as markup or an extra selectable locale.

## B038 — CreditsView

Owned module: `apps/client/src/pilot100/credits/index.tsx`.

```ts
export interface CreditsViewProps { readonly entries: readonly { readonly id: string; readonly title: string; readonly creator: string; readonly license: string; readonly sourceUrl: string | null }[]; readonly onOpenSource: (id: string) => void; readonly onClose: () => void; }
export function CreditsView(props: CreditsViewProps): import('react').ReactElement;
```

Render reviewed manifest-derived credits supplied as data. Never hardcode an unselected music track or license claim. Host owns URL opening; blank/unapproved entries produce an honest empty state rather than downloading media.

Independent acceptance:
- Empty credits accurately state that no approved entries are available.
- Each provided title/creator/license is safely rendered without inferred licensing.
- Source requests emit the record ID only when sourceUrl is present; the view does not navigate or fetch URLs.

## B039 — AchievementGrid

Owned module: `apps/client/src/pilot100/achievement-grid/index.tsx`.

```ts
export interface AchievementGridProps { readonly achievements: readonly { readonly id: string; readonly title: string; readonly unlocked: boolean; readonly icon: { readonly src: string; readonly alt: string } | null }[]; readonly reducedMotion: boolean; readonly onDetails: (id: string) => void; }
export function AchievementGrid(props: AchievementGridProps): import('react').ReactElement;
```

Provide the neutral-chrome achievement grid from a supplied reviewed catalogue. Locked badges use quiet neutral treatment; unlocked approved art can retain full colour and subtle reduced-motion-safe emphasis. No48entry catalogue,predicate or asset is invented.

Independent acceptance:
- Locked and unlocked states have distinct accessible labels independent of artwork/colour.
- Each detail action emits a supplied ID and empty catalogue is truthful.
- Missing art has an explicit accessible unavailable state with no improvised badge or unlock logic.

## B040 — AchievementDetail

Owned module: `apps/client/src/pilot100/achievement-detail/index.tsx`.

```ts
export interface AchievementDetailProps { readonly title: string; readonly description: string; readonly unlocked: boolean; readonly progress: { readonly current: number; readonly target: number } | null; readonly icon: { readonly src: string; readonly alt: string } | null; readonly unlockedAtLabel: string | null; readonly reducedMotion: boolean; readonly onClose: () => void; }
export function AchievementDetail(props: AchievementDetailProps): import('react').ReactElement;
```

Render badge-detail glass content using supplied catalogue/progress only. Unknown progress/time remains unknown. No reconciliation of contradictory achievement22 or local event processing; no fabricated art,predicate or unlock date.

Independent acceptance:
- Known progress is accessible; invalid/zero-target/unknown progress does not divide by zero or claim completion.
- Locked details do not show an invented unlock date and missing art stays explicit.
- Reduced motion suppresses glow motion while title,description and close remain available.

## B041 — HowToPlay

Owned module: `apps/client/src/pilot100/tutorial/index.tsx`.

```ts
export interface HowToPlayProps { readonly step: number; readonly steps: readonly { readonly id: string; readonly title: string; readonly body: string; readonly practiceChoices: readonly { readonly id: string; readonly label: string }[] }[]; readonly selectedChoiceId: string | null; readonly feedback: string | null; readonly onPractice: (id: string) => void; readonly onStepChange: (step: number) => void; readonly onClose: () => void; }
export function HowToPlay(props: HowToPlayProps): import('react').ReactElement;
```

Build a short controlled tutorial reader with interactive practice supplied by caller. Teach six-track/direct-vote/private-Route-Gate concepts only through reviewed supplied content. Do not copy old committee/approval/five-mark prototype rules or resolve unspecified game decisions.

Independent acceptance:
- Step navigation stays within supplied bounds and empty steps show unavailable content.
- Practice emits only an offered ID with supplied feedback rather than claiming a hidden game outcome.
- A canonical fixture covers direct one-candidate voting,two operators and ambiguous evidence without exposing factions.

## B042 — ReconnectOverlay

Owned module: `apps/client/src/pilot100/reconnect/index.tsx`.

```ts
export interface ReconnectOverlayProps { readonly state: 'offline' | 'reconnecting' | 'synchronizing' | 'restored' | 'failed'; readonly canRetry: boolean; readonly message: string | null; readonly onRetry: () => void; readonly onLeave: () => void; }
export function ReconnectOverlay(props: ReconnectOverlayProps): import('react').ReactElement;
```

Present safe temporary-connection states with explicit sync before restored input. This view does not cache private snapshots,subscribe to transport or change permanent spectator status. Retry/leave are host requests,never promises of recovery.

Independent acceptance:
- Offline,reconnecting,synchronizing,restored and failed have distinct supplied state text.
- Retry follows canRetry and cannot restart a match or restore a spectator’s actions.
- No role/private choice is retained or exposed during an unavailable recipient state.

## B043 — ErrorOverlay

Owned module: `apps/client/src/pilot100/error/index.tsx`.

```ts
export interface ErrorOverlayProps { readonly title: string; readonly message: string; readonly recovery: 'retry' | 'back' | 'none'; readonly busy: boolean; readonly onRecover: () => void; readonly onClose: () => void; }
export function ErrorOverlay(props: ErrorOverlayProps): import('react').ReactElement;
```

Provide error-sheet content using already-sanitized authority/client messages. Never accept raw Error objects,stack traces,HTTP bodies,room existence probes or credentials. Recovery is explicit,not an automatic paid retry.

Independent acceptance:
- Retry/back/none render the correct recovery action and busy suppresses duplicates.
- Arbitrary message text is escaped rather than injected as HTML.
- No stack/private state/log export or automatic retry is introduced.

## B044 — LeaveConfirmation

Owned module: `apps/client/src/pilot100/leave-confirmation/index.tsx`.

```ts
export interface LeaveConfirmationProps { readonly mode: 'solo' | 'multiplayer'; readonly busy: boolean; readonly consequence: string; readonly onConfirm: () => void; readonly onCancel: () => void; }
export function LeaveConfirmation(props: LeaveConfirmationProps): import('react').ReactElement;
```

Present clear supplied leave consequences and explicit Leave/Stay actions. Multiplayer continues for other players. Confirm requests authority navigation; component does not delete state,reveal roles or equate leaving with the game-power Disconnect.

Independent acceptance:
- Confirm fires only when not busy and cancel retains the current view.
- Multiplayer wording says the match continues and makes no host-migration rule claim.
- No secret role is revealed and no automatic destructive action occurs on mount/close.

## B045 — MatchEntryTransition

Owned module: `apps/client/src/pilot100/match-entry/index.tsx`.

```ts
export interface MatchEntryTransitionProps { readonly state: 'preparing' | 'acknowledged' | 'failed'; readonly reducedMotion: boolean; readonly message: string | null; readonly onCancel: () => void; }
export function MatchEntryTransition(props: MatchEntryTransitionProps): import('react').ReactElement;
```

Render the documented City signal acquired / Entering the blackout cinematic handoff as controlled preparation/acknowledged/failed presentation. No role reveal or playable fake engine is created. The authority/presentation host owns the brief handoff timing and route change; reduced motion retains clear transition text.

Independent acceptance:
- Preparing never claims that a match has started before acknowledged state.
- Failed state shows supplied safe text and cancellation without assigning roles or starting timers.
- Reduced motion removes decorative travel and no internal timer advances gameplay or routes.

## B046 — BannerDock

Owned module: `apps/client/src/pilot100/banner-dock/index.tsx`.

```ts
export interface BannerDockProps { readonly platform: 'web' | 'ios' | 'android'; readonly adsRemoved: boolean; readonly reservedHeight: number; readonly state: 'unavailable' | 'loading' | 'loaded' | 'failed'; readonly label: string; }
export function BannerDock(props: BannerDockProps): import('react').ReactElement;
```

Implement an accessible fixed bottom banner-dock frame with safe-area padding. Web/Remove Ads occupies no ad height; eligible native free states retain supplied reserved height through loading/failure so layout does not jump. Actual ad surface is separately mounted by the future reviewed native adapter.

Independent acceptance:
- Native free loading,loaded,failed and unavailable states keep the same supplied reserved height.
- Web and adsRemoved states suppress ad reservation and show no fake advertisement.
- Invalid negative/nonfinite height cannot cover controls; dock does not call SDKs or request targeting data.

## B047 — RemoveAdsControls

Owned module: `apps/client/src/pilot100/remove-ads/index.tsx`.

```ts
export interface RemoveAdsControlsProps { readonly available: boolean; readonly owned: boolean; readonly pending: boolean; readonly priceLabel: string | null; readonly platformLabel: string; readonly message: string | null; readonly onPurchase: () => void; }
export function RemoveAdsControls(props: RemoveAdsControlsProps): import('react').ReactElement;
```

Render platform-scoped one-time purchase intent,owned/pending/unavailable states and supplied localized price. Never create an SKU,call a store,simulate success or promise cross-store entitlement. No price means no fabricated amount or discount countdown.

Independent acceptance:
- Owned,pending or unavailable states cannot emit purchase requests.
- Available purchase displays the supplied price/platform and emits one intent callback.
- Unknown price remains unknown; rendering never grants entitlement or promises account-based cross-platform restoration.

## B048 — RestorePurchases

Owned module: `apps/client/src/pilot100/restore-purchases/index.tsx`.

```ts
export interface RestorePurchasesProps { readonly available: boolean; readonly state: 'idle' | 'pending' | 'restored' | 'none-found' | 'failed'; readonly platformLabel: string; readonly message: string | null; readonly onRestore: () => void; }
export function RestorePurchases(props: RestorePurchasesProps): import('react').ReactElement;
```

Expose a distinct Restore purchases flow and supplied outcome in Settings. Native stores remain authoritative; web unavailable is explicit. No receipt processing,account login,cross-store promise or entitlement mutation.

Independent acceptance:
- Unavailable/pending states disable restore and enabled idle state emits one callback.
- Restored,none-found and failed remain distinct actual supplied outcomes.
- Copy scopes restoration to the supplied platform and never claims success before state=restored.

## B049 — ShellNavigation

Owned module: `apps/client/src/pilot100/shell-navigation/index.tsx`.

```ts
export interface ShellNavigationProps { readonly selected: 'home' | 'how-to-play' | 'achievements' | 'settings'; readonly hidden: boolean; readonly onNavigate: (route: 'home' | 'how-to-play' | 'achievements' | 'settings') => void; }
export function ShellNavigation(props: ShellNavigationProps): import('react').ReactElement;
```

Render the common four-item neutral-glass navigation with accessible current-page state. Hidden immersive mode renders no rail/tab stops. Callback requests a route; no global router/App import or unmerged screen dependency.

Independent acceptance:
- All four route values emit exactly the selected action and expose the controlled current page.
- hidden=true removes all navigation controls from DOM/tab order.
- Labels and selection remain readable without colour,emoji-only icons or duplicate Play actions.

## B050 — ModalViewport

Owned module: `apps/client/src/pilot100/modal-viewport/index.tsx`.

```ts
import type { ReactNode } from 'react';
export interface ModalViewportProps { readonly background: ReactNode; readonly overlay: { readonly id: string; readonly title: string; readonly content: ReactNode; readonly dismissible: boolean; readonly onDismiss: () => void } | null; readonly dock: ReactNode; readonly reservedDockHeight: number; readonly reducedMotion: boolean; }
export function ModalViewport(props: ModalViewportProps): import('react').ReactElement;
```

Implement the generic composition host using slot props only. The entire background receives uniform blur,dim,desaturation and inertness under one overlay; contain focus,announce its title,restore previous focus on close/unmount and allow Escape only when dismissible. Keep a persistent dock slot above safe area without making underlying gameplay interactive. No B sibling import is needed.

Independent acceptance:
- Opening a dialog traps keyboard focus,labels it and blocks pointer/focus/assistive interaction with the entire background.
- Closing/removing/unmounting restores focus and prior inert/style state; nondismissible Escape does not bypass mandatory decisions.
- Safe-area/reserved-dock layout remains usable with long content/reduced motion and exactly one overlay,without pausing authority or mutating inputs.
