# Afterimage — Monetization Spec v0

**Status:** product contract. Monetization is permitted only outside live social
deduction. It must never interrupt a decision, timer, role reveal, City Moment
or Match End reveal.

## Model

1. **AdMob banner** for the free experience.
2. **Interstitial** at a natural post-match boundary only.
3. One non-consumable platform IAP: **Remove Ads**.
4. No consumable currency, loot box, power purchase, rewarded gameplay
   advantage, subscription or pay-to-win mechanic in v1.

## Placement contract

### Persistent banner dock

The free experience has one **always-visible, fixed AdMob banner dock** at the
very bottom of the app. It stays mounted through every menu, lobby, game phase,
modal and cinematic transition; it does not fade out at game start. Only the
Remove Ads entitlement removes it.

- The app reserves the banner's adaptive height plus bottom safe area before
  first render. No screen may jump, resize unexpectedly or move navigation when
  an ad loads/fails/refreshes.
- Home navigation sits immediately **above** this dock. Gameplay, modals and
  timers lay out within the remaining safe viewport; no vital action, player
  card, timer, input or close target may hide behind the ad.
- The banner itself remains platform-owned and clearly distinct from gameplay.
  It must never imitate glass controls, be covered by a modal, or receive a
  deceptive placement near a tap target.
- During the lobby→match cinematic, the scene fades/loads above the persistent
  dock. The player gets a hard transition into gameplay without a banner blink
  or layout reflow.

| Surface | Persistent banner | Interstitial |
| --- | --- | --- |
| Every free-app surface, including Home, lobby, gameplay, modal, City Moment and transitions | Yes: fixed bottom dock | Never while live game/reveal is visible |
| User taps Back to lobby or Exit game after Match End | Still fixed | Eligible natural break |

## Interstitial frequency / safety

- Eligibility begins only after a completed match and only after the user has
  dismissed/read Match End.
- Frequency cap: at most **one per two completed matches**, never the first
  completed match of an install/session, never back-to-back.
- If unavailable, fails to load, consent is unavailable, or user owns Remove
  Ads: proceed immediately. Match flow never waits for an ad.
- Never show it on app open, game start, deadline, reconnect, Disconnect,
  error, background/foreground transition or while any modal blocks gameplay.
- Ads must be clearly identifiable and dismissible.

## Remove Ads IAP

- SKU concept: `afterimage_remove_ads`; one-time, non-consumable purchase.
- Removes banners and interstitials immediately on that platform.
- Settings exposes **Remove Ads** and **Restore purchases**; purchased state is
  visible without a fake sale/expiry timer.
- Native stores are the source of truth: StoreKit for iOS and Google Play
  Billing for Android. Verify/store entitlement through the platform adapter.
- The game deliberately has no account. Therefore v1 promises restoration on
  the purchaser's store/account and platform, **not** automatic cross-store or
  cross-device web entitlement. A later cross-platform promise needs an
  explicit account/receipt-linking product decision.

## Privacy, compliance and test gates

- Obtain and persist applicable advertising consent before initializing ad
  requests; offer privacy choices from Settings. Region-specific consent (EEA,
  UK, Switzerland) must be handled by the approved consent flow.
- Do not use sensitive data/secret role data, chat content, player decisions,
  lobby code or gameplay telemetry for ad targeting.
- Use AdMob test units in development. Never ship test IDs or test live IDs
  through the wrong environment.
- Review age rating, ad filtering, app privacy disclosure and platform billing
  requirements before release.
- Apple requires in-app purchase for unlocking in-app functionality and a
  restore mechanism for restorable purchases. Interstitials must be obvious
  ads with accessible dismissal. See official sources:
  [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/),
  [AdMob formats](https://developers.google.com/admob/ios/quick-start),
  [AdMob interstitial placement](https://developers.google.com/admob/android/next-gen/interstitial).

## Swarm implementation contract

- Define `AdsPort` and `PurchasePort` adapters. UI consumes semantic state
  (`bannerEligible`, `interstitialEligible`, `adsRemoved`); it never calls an
  SDK directly.
- Use a deterministic `AdEligibility` policy: persistent banner for every
  free-app surface; interstitial only at the post-match exit cap above. Test
  every layout with the reserved dock present.
- Platform workers integrate Capacitor-compatible native adapters only after
  the app IDs, privacy settings and production ad unit IDs are supplied by
  Sergio; no keys/IDs in source control.
- Web build defaults to a no-op adapter. It may later use a separately approved
  web monetization strategy.
- Required tests: banner dock stays mounted through every live-game phase and
  cinematic; IAP remove ads suppresses all formats; failed load does not block
  navigation; restore re-applies entitlement; no vital target is hidden; layout
  does not jump when banner load state changes.
