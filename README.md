<div align="center">
  <h1>Spotify Lyrics Translator (v0.1) </h1>
  <video src="https://github.com/user-attachments/assets/6641e419-d5ef-46e9-ab17-1f446f373dfb" width="360" autoplay="false"></video>

  <br />
 
 [![MIT License](https://img.shields.io/github/license/in-c0/spotify-lyrics-translator?t=1)](LICENSE)
 [![Issues](https://img.shields.io/github/issues/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/issues)
 [![Pull Requests](https://img.shields.io/github/issues-pr/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/pulls)
 [![Latest Release](https://img.shields.io/github/v/release/in-c0/spotify-lyrics-translator?t=1)](https://github.com/in-c0/spotify-lyrics-translator/releases/latest)


  <strong> 🎵 A NextJS/React lyrics translator app designed to work with Spotify Desktop 🎤🎵 </strong>

  <a href="https://github.com/in-c0/spotify-lyrics-translator/issues">Report a Bug</a>
  <strong>·</strong>
  <a href="https://github.com/in-c0/spotify-lyrics-translator/issues">Request a Feature</a>


  <br />

  **Check out <a href="https://github.com/sglkc/moegi">Moegi Spotify Web Extension made by @sglkc</a>** (Credits for the original idea & design inspiration)

  This app communicates with Spotify Desktop through the **Spotify Web Playback SDK**, more native OS-level extension possibilities compared to the Chrome extension for the Spotify Web Player, which primarily modifies CSS. 

</div>

  <br />

### **Why build this?**

This project was built primarily for **educational purposes** and to explore additional functionalities that could be extended into:
- **Audio reactions**
- **AI-driven lyrics analysis**
- **Community insights** (e.g., integration with **Genius**)

The app should be portable to **Mac, Linux**, and **mobile devices**, although these platforms haven't been tested yet.

  <br />

### Current Issues (v0.1):
- **Japanese Romanization** is incomplete due to the complexity of Kanji.
- **Language settings** have not yet been implemented.

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
3. Set up <a href="#how-to-set-up-environment-variables">Environment Variables</a>
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_TRANSLATE_API_KEY=...
```
4. Run the development server
```
npm run dev
```

### How To Set Up Environment Variables

To set up this app, you’ll need both **Google Translate API** and **Spotify Developer** credentials. 
If you are developing locally, create a new file in the root project directory named `.env.local`. (Do NOT share your API keys/Secret or commit the file!)

#### 1. **Google Translate API**
- Create a **Google Cloud developer account** and generate your API key.
  
  *Note*: The Google Translate API is **not free**. If you're looking for alternatives, check out [google-translate-api-x](https://www.npmjs.com/package/google-translate-api-x).

```
GOOGLE_TRANSLATE_API_KEY=...(Set up here: https://cloud.google.com/apis)
```

#### 2. Spotify Developer Account
Set up your [Spotify Developer](https://developer.spotify.com/dashboard) account and obtain your client secret.
```
SPOTIFY_CLIENT_SECRET=... (Set up here: https://developer.spotify.com/documentation/web-api)
```

Your final `.env` would look something like this for local development:
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_TRANSLATE_API_KEY=...
```

I’m exploring ways to make this app more accessible to users, as most cloud-based solutions incur costs. Some ideas for future development include:
 - Running everything locally, reducing dependency on cloud services (except for Spotify interaction), i.e.
 - Local LLM for translation ([GPT4ALL](https://github.com/nomic-ai/gpt4all))
 - Local transcription AI (e.g. [Moises.ai](https://moises.ai/) or finetune Whisper, if there is a reliable way to somehow extract only the vocals out)
   
(... or I could host a server with a couple of ads, as long as it aligns with the license agreements... It probably won't in the current state given the Musixmatch API being difficult to obtain.)

  <br />

### Credits

A big thank you to @BlueCatSoftware for providing the [Lyrix](https://github.com/BlueCatSoftware/Lyrix) through Musixmatch,
and to @sglkc for the inspiration behind this project ([Chrome Extension](https://github.com/sglkc/moegi)).

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
