# Distribution & Licensing Notes (informal)

> **Not legal advice.** These are working notes for the project's own strategy, written by a non-lawyer. For anything commercial, consult an IP lawyer — especially under Australian law, which has no US-style "fair use" (only narrower "fair dealing" categories that a lyrics-companion app does not fit).

## Decision (current)

**Keep this a local, BYO-API-key, open-source hobby project.** No monetization, no polished Store/widget product, no hosted lyrics service. The reasons are below.

## Why lyrics are legally heavy

Lyrics carry two stacked copyrights:

1. **The composition** — the words themselves, owned by songwriters / music publishers.
2. **The sound recording** — implicated if you transcribe lyrics *from the audio*, owned by the label.

Displaying full lyrics requires a license from the publishers. This is the entire reason Musixmatch, LyricFind, and Genius exist — they are licensing intermediaries. Unlicensed full-lyric display is straightforward infringement.

## Three things that are *not* loopholes

- **AI transcription.** A transcript of copyrighted lyrics is a reproduction regardless of whether a human or an AI (e.g. Whisper) produced it. Transcribing from the recording can additionally implicate the sound-recording right. AI changes the cost structure, not the legal status.
- **Translation.** Translations are **derivative works** — the right to prepare derivatives is exclusive to the copyright holder. A translated lyric needs *more* permission than a verbatim one, not less.
- **Romanization.** A transliteration of the licensed original is still a representation of the copyrighted text. Lower-profile, but not clearly exempt, and it still presumes you had the right to display the original.

## Why "go local" helps cost/privacy but not copyright

Running translation and romanization **on the user's machine** is a real win for cost and privacy ("we host and serve nothing"). But it does **not** change the copyright analysis, because the exposure isn't *where translation happens* — it's the **lyrics source**. Pulling lyrics from an unlicensed path is the core risk whether the translation runs in the cloud or locally.

## Why store distribution is *higher* risk, not lower

- **App Store / Google Play / Microsoft Store / Chrome Web Store** all have IP policies and DMCA takedown channels. Publishing there increases visibility and hands rights-holders a one-click removal path.
- A **polished, monetized** listing reads as "commercial product displaying unlicensed lyrics" — the profile most likely to be targeted.
- **Spotify's Developer Terms** govern the Web Playback SDK: scraping the internal lyrics endpoint violates ToS, and companion apps generally may not monetize around Spotify content or build a replacing/competing experience.

Community tools (e.g. Moegi) survive by being **small, non-commercial, local, and quiet** — a low-profile posture, not a legal safe harbor. Turning this into a Store product removes every one of those protective attributes.

## Posture we're keeping

| Attribute | Choice | Why |
|-----------|--------|-----|
| Hosting | None — runs locally | We serve no lyrics; user's machine does the work |
| API keys | Bring-your-own (Spotify + translation) | User's own credentials, user's own usage |
| License | Open-source (MIT), non-commercial in spirit | Hobby / educational posture is the most defensible |
| Distribution | GitHub repo users build/run themselves | Not a mass-market Store product |
| Monetization | None | Avoids the "commercial infringer" profile |
| Lyrics source | Third-party; treat as the real risk surface | Where the copyright exposure actually lives |

## If we ever wanted to remove the wall

Only two real doors exist:

1. **License the lyrics** — Musixmatch or LyricFind developer tier (gated, expensive). This is the "real product" path.
2. **Change the content** — operate only on content the user supplies, or content that is licensable.

Everything else is a matter of staying low-profile, which is a practical mitigation, not a legal solution.

## Relationship to the Spotify proposal

This posture and the [Spotify feature suggestion](./spotify-feature-suggestion.md) are complementary. The local open-source app is the **proof-of-concept leverage**; the pitch's thesis is *"only Spotify can clear the rights."* So the smart play is to keep the demo lean and local and push the feature toward the party that can implement it legally — not to try to become that party.
