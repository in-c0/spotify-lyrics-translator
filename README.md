<div align="center">
  <h1>🎤 Spotify Lyrics Translator</h1>

  <strong>Sing along to songs in any language.</strong><br />
  Live, time-synced <strong>romanization</strong> + <strong>translation</strong> right next to your Spotify lyrics —
  so you can actually read and sing K-pop, J-pop, anime OSTs, Latin, and more.

  <br /><br />

  <a href="https://github.com/in-c0/spotify-lyrics-translator">
    <img src="docs/demo.gif" alt="Live demo: Korean lyrics shown with Latin romanization and English translation, time-synced to a Spotify track" width="600" />
  </a>

  <sub><a href="https://github.com/user-attachments/assets/6641e419-d5ef-46e9-ab17-1f446f373dfb">▶ watch the full-length video</a></sub>

  <br />

 [![MIT License](https://img.shields.io/github/license/in-c0/spotify-lyrics-translator?t=1)](LICENSE)
 [![Issues](https://img.shields.io/github/issues/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/issues)
 [![Pull Requests](https://img.shields.io/github/issues-pr/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/pulls)
 [![Latest Release](https://img.shields.io/github/v/release/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/releases/latest)

  <br />

  <a href="https://github.com/in-c0/spotify-lyrics-translator/issues">Report a Bug</a>
  <strong>·</strong>
  <a href="https://github.com/in-c0/spotify-lyrics-translator/issues">Request a Feature</a>

</div>

<br />

### ✨ What it does

- 🔤 **Romanization** — renders non-Latin scripts (Japanese, Korean, Chinese, Cyrillic) in Latin characters so you can sing along even if you can't read the original.
- 🌍 **Translation** — shows your language beneath each synced line so you understand what the song means.
- ⏱️ **Time-synced** — follows whatever you play in **any** Spotify app (desktop, phone, web) via the Spotify Web API; synced lyrics come from [LRCLIB](https://lrclib.net), a free community lyrics database.
- 💸 **No credit card to try** — translation works out of the box with a free, no-key translator by default. An official Google Translate API key is *optional* for higher reliability.
- 🖥️ **Runs locally, bring-your-own keys** — nothing is hosted; your Spotify credentials stay on your machine. This is an open-source hobby/educational project.

> Inspired by [Moegi](https://github.com/sglkc/moegi) by @sglkc (original idea & design inspiration).

> ⚠️ **Spotify rules for personal (Development Mode) apps, since 2026:** the person who creates the Spotify app needs **Premium**, and up to **5 users** can log in — add anyone besides yourself under the app's *User Management*. Play/pause/skip buttons also need Premium on the listening account.

  <br />

### **Why build this?**

This project was built primarily for **educational purposes** and to explore additional functionalities that could be extended into:
- **Audio reactions**
- **AI-driven lyrics analysis**
- **Community insights** (e.g., integration with **Genius**)

The app should be portable to **Mac, Linux**, and **mobile devices**, although these platforms haven't been tested yet.

  <br />

### Known limitations
- **Japanese romanization** converts kana only; Kanji are left as-is.
- Lyrics coverage depends on [LRCLIB](https://lrclib.net). Tracks without synced lyrics show plain lyrics (no highlighting) or nothing.

  <br />

### Setup Instructions


1. Clone the repo
```
git clone https://github.com/in-c0/spotify-lyrics-translator.git
```
2. Install dependencies
```
npm install
```
3. Set up <a href="#how-to-set-up-environment-variables">Environment Variables</a> — just copy the example file and fill in your Spotify keys:
```
cp .env.example .env.local
```
4. Run the development server
```
npm run dev
```
5. Open **http://127.0.0.1:3000** (not `localhost` — see below), log in, and play any song in Spotify. It appears automatically.

### How To Set Up Environment Variables

All variables live in `.env.local` (copy it from [`.env.example`](.env.example)). Only the **Spotify** credentials are required — the translator works with no key by default. (Do NOT share your keys/secret or commit `.env.local`!)

#### 1. **Translation (optional — free by default)**
The app uses a free, no-key translator out of the box, so you can leave `GOOGLE_TRANSLATE_API_KEY` blank. Set it only if you want the official Google Cloud Translate API for higher reliability / rate limits.

  *Note*: the free translator is unofficial and rate-limited — perfect for a local hobby setup, not production scale.

```
GOOGLE_TRANSLATE_API_KEY=   # leave blank to use the free translator
```

#### 2. Spotify app (required)
1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → **Create app**. Select **Web API**.
2. Under **Redirect URIs**, add exactly `http://127.0.0.1:3000/callback`.
   Spotify [no longer accepts `localhost`](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) — use the loopback IP.
3. Copy the **Client ID** and **Client secret** into `.env.local` (the client ID goes in two variables).

Your final `.env` would look something like this for local development:
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
GOOGLE_TRANSLATE_API_KEY=   # optional
```

I’m exploring ways to make this app more accessible to users, as most cloud-based solutions incur costs. Some ideas for future development include:
 - Running everything locally, reducing dependency on cloud services (except for Spotify interaction), i.e.
 - Local LLM for translation ([GPT4ALL](https://github.com/nomic-ai/gpt4all))
 - Local transcription AI (e.g. [Moises.ai](https://moises.ai/) or finetune Whisper, if there is a reliable way to somehow extract only the vocals out)
   
### Troubleshooting

| You see | Fix |
| --- | --- |
| Spotify says **"INVALID_CLIENT: Invalid redirect URI"** | The Redirect URI in the dashboard must be exactly `http://127.0.0.1:3000/callback`. |
| "Spotify rejected the app credentials" after login | Re-check `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` in `.env.local`, then restart `npm run dev`. |
| Login works for you but not a friend | Add their Spotify email under your app's **User Management** (max 5). |
| "Play a song in any Spotify app…" | Start playback on any device; the page picks it up within a few seconds. |
| "No lyrics found" | LRCLIB doesn't have this track yet — you can [contribute it](https://lrclib.net). |

  <br />

### Credits

Synced lyrics by [LRCLIB](https://lrclib.net) (community-contributed). Earlier versions used @BlueCatSoftware's [Lyrix](https://github.com/BlueCatSoftware/Lyrix), which is no longer online —
thanks for getting this project started — and to @sglkc for the inspiration behind this project ([Chrome Extension](https://github.com/sglkc/moegi)).

  <br />

### License

MIT License

Credits appreciated but not necessary.

  <br />

### Have Questions or Feature Requests?

Feel free to start a new [Discussion](https://github.com/in-c0/spotify-lyrics-translator/discussions) or create a new [Issue](https://github.com/in-c0/spotify-lyrics-translator/issues). Contributions are welcome via issues or PRs!

  <br />

### Disclaimer

Please note that directly modifying the Spotify Desktop client may violate **Spotify's Terms of Service**. Although this app does **not** modify the Spotify client directly, please ensure that you comply with all relevant terms and conditions when using this app.

[Spotify Developer Policy](https://developer.spotify.com/policy/)

[Spotify Terms of Service](https://www.spotify.com/legal/end-user-agreement/)

  <br />
