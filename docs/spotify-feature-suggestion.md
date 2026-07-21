# Feature Suggestion to Spotify: Native In-App Lyrics Translation & Romanization

**Author:** in-c0
**Status:** Proposal / RFC
**Related project:** [spotify-lyrics-translator](https://github.com/in-c0/spotify-lyrics-translator) — a working proof-of-concept built on the Spotify Web Playback SDK.

---

## 1. Summary

Spotify already ships **time-synced lyrics** (powered by Musixmatch) to hundreds of millions of listeners. This proposal asks Spotify to add two adjacent capabilities on top of that existing surface:

1. **Inline translation** — show the listener's chosen language beneath each synced lyric line.
2. **Romanization / transliteration** — render non-Latin scripts (Japanese, Korean, Chinese, Cyrillic, Arabic, Thai, etc.) in Latin characters so listeners can *sing along* even when they can't read the original script.

Both would appear inside the existing **Now Playing → Lyrics** view as opt-in toggles. No new screen, no new tab — just more from the surface users already open.

This is not speculative. The linked open-source project already does all of this against Spotify's own SDK. This document distills what that prototype proved into a first-party product proposal.

---

## 2. The problem

Music is global, but lyric comprehension is not.

- **K-pop, J-pop, Latin, Afrobeats, and anime OSTs** routinely chart worldwide among listeners who don't speak the source language.
- Spotify's lyrics view shows the *original* script only. A listener who loves a song but can't read Hangul, Kana/Kanji, or Cyrillic gets synced text they **cannot phonetically follow or understand**.
- Today these users leave the app: they open a browser, search "[song] romanized lyrics" or "[song] english translation," and read on a third-party lyrics site — often mid-song, splitting attention away from Spotify.

Two distinct unmet needs hide inside "I don't understand these lyrics":

| Need | User intent | Solution |
|------|-------------|----------|
| **Comprehension** | "What does this song *mean*?" | Translation into my language |
| **Participation** | "I want to *sing along*." | Romanization of the original script |

They are different features. A romanized line lets you sing; a translated line lets you understand. The best experience offers both, independently toggleable.

---

## 3. The proposal

Extend the existing Lyrics panel with a lightweight settings affordance:

```
┌─────────────────────────────────────────────┐
│  ♪  Now Playing — "밤편지" · IU              │
│                                              │
│   너에게 못했던 말                            │   ← original (synced)
│   neoege moshaetdeon mal                     │   ← romanization (toggle)
│   The words I couldn't say to you            │   ← translation (toggle)
│                                              │
│   ⚙ Lyrics display                           │
│     ◻ Show romanization                      │
│     ◻ Show translation →  [ English ▾ ]      │
└─────────────────────────────────────────────┘
```

**Interaction principles**

- **Opt-in and sticky.** Off by default; once a user enables it, it persists per-account across devices.
- **Per-line stacking, not replacement.** The original synced line stays as the timing anchor; translation/romanization render as secondary lines beneath it, in a dimmer weight.
- **Highlighting still tracks the original line**, so karaoke-style scroll is unaffected.
- **Graceful absence.** If a track has no lyrics, or a language pair is unsupported, the toggles simply don't appear — no error state.

---

## 4. Why Spotify, and why now

- **You already own the hard part.** The synced-lyrics pipeline, the Musixmatch relationship, and the Now Playing surface all exist. Translation and romanization are additive layers, not a new subsystem.
- **Retention & session length.** Every "romanized lyrics" Google search is a moment a listener *left* Spotify's surface. Keeping that in-app is a direct engagement win.
- **Accessibility & inclusion.** This materially helps language learners and the large cross-cultural listenership driving global music trends — a story that aligns with Spotify's "music for everyone" positioning.
- **Differentiation.** Native, correctly-timed, correctly-romanized lyrics are meaningfully better than the scraped, ad-heavy third-party sites users fall back to today.
- **Competitive context.** Community tools (browser extensions, this project, apps like Moegi) already demonstrate the demand — users are hacking this in themselves. That's the clearest possible signal.

---

## 5. Technical feasibility (validated by the prototype)

The open-source prototype implements the full path against Spotify's own SDK, using off-the-shelf libraries. Everything below is already working code, not a wishlist:

| Capability | Prototype approach | First-party equivalent |
|------------|--------------------|------------------------|
| Get current track + synced position | Spotify Web Playback SDK | Native player state |
| Fetch synced lyrics | Musixmatch (via Lyrix) | Existing Spotify lyrics pipeline |
| Translate | Google Cloud Translate | Any translation provider / in-house |
| Japanese romanization | `wanakana` | " |
| Korean romanization | `@romanize/korean` | " |
| Chinese romanization | `pinyin-pro` | " |
| Cyrillic transliteration | `cyrillic-to-translit-js` | " |
| Generic fallback | `any-ascii` | " |

**Notes learned from building it:**

- **Romanization is per-script, not one library.** Each writing system needs its own transliterator; there is no single universal one. A first-party implementation should treat romanization as a pluggable per-language module (exactly as the prototype does).
- **Japanese is the hardest case.** Kanji has multiple readings that depend on context; naive romanization is incomplete. This is the one area where Spotify's scale (and potential access to reading annotations / furigana data) would produce a materially better result than any hobby project can.
- **Translation should be cached per (track, target-language).** Lyrics are static; translating once and caching serves millions cheaply. The prototype uses a simple `node-cache`; Spotify would cache at the CDN/lyrics-service layer.
- **Latency budget is generous.** Lyrics are fetched at track start, not per-frame, so translation/romanization can be precomputed the moment a track loads.

---

## 6. Licensing & rights (the real gating factor)

The honest blocker is **not** engineering — it's rights. Lyrics are licensed content, and derivative works (translations, romanizations) touch publisher rights.

- **Romanization** is a phonetic transliteration of the *licensed original* — arguably lower-risk than translation, but still should be cleared with the lyrics provider/publishers.
- **Translation** creates a derivative text and needs explicit rights coverage in the Musixmatch/publisher agreements.
- Spotify is uniquely positioned to negotiate this at the licensing layer — something no third-party tool (including this prototype) can legitimately do. **This is precisely why the feature belongs to Spotify and not to a community extension.**

The prototype's own README carries a disclaimer to this effect; the project exists to *demonstrate the UX*, explicitly leaving the rights question to the party that can actually solve it: Spotify.

---

## 7. Suggested phased rollout

1. **Phase 0 — Romanization only, top scripts.** Ship romanization (JA/KO/ZH/RU) with no translation. Lower rights risk, immediately unlocks "sing along" for the highest-demand catalogs (K-pop, J-pop, anime).
2. **Phase 1 — Translation into a handful of major languages** (EN, ES, PT, etc.) for tracks where rights are cleared, cached per track+language.
3. **Phase 2 — Full language matrix + per-account sticky preference synced across devices.**
4. **Phase 3 — Quality loop:** let users flag a bad romanization/translation line (community-sourced correction, à la how synced-lyric timing was refined).

---

## 8. Success metrics

- ↓ in-session drop-offs to external lyrics sites (measurable via app→browser handoff and search behavior).
- ↑ Lyrics-panel open rate and dwell time on non-native-language tracks.
- ↑ session length / completion rate on international catalog.
- Adoption rate of the toggles among listeners who play cross-language content.

---

## 9. Ask

Consider promoting lyrics **translation + romanization** from a thing users hack together with community tools into a **native, rights-cleared, correctly-timed Spotify feature**.

The UX is already proven and open-source at
👉 https://github.com/in-c0/spotify-lyrics-translator

The demand is already visible in the community tools people build to fill the gap. The one piece only Spotify can provide — cleared rights at the licensing layer — is also the piece that would make this dramatically better than anything a third party can ship.

---

*This document accompanies an open-source proof-of-concept and is intended as a good-faith product suggestion. It does not modify the Spotify client and respects the [Spotify Developer Policy](https://developer.spotify.com/policy/).*
