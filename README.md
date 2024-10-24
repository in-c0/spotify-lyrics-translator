
# Spotify Lyrics Translation App (v0.1) for Desktop

(Demo video here)

A NextJS/React app for Spotify Desktop. Inspired by the **Chrome extension for Spotify Web Player** - Thanks to @sglkc for sharing the beautiful work!
Try it here >>> https://github.com/sglkc/moegi <<<

This app works in tandem with Spotify Desktop and can communicate with the user account through Spotify Web Playback SDK, unlike @sglkc/moegi which runs on Chrome and only modifies the end result/CSS. The end user experience is pretty much the same anyways.

**Then why build this?**
Largely for educational purposes, and for further extension possibilities as a desktop wallpaper or app. Something we could explore are:
- Reacting to audio
- AI Lyrics analysis
- Community analysis (Genius?)

Should also be portable to Mac/Linux and mobile devices, but this hasn't been tested yet.

### Current issues (v0.1):
! Japanese romanization is partial due to Kanji
! Language settings are not implemented yet

### Setup

The app uses Google Translate API, which means you need to set up a Google Cloud developer account and enter your API Key in `.env`.
(Google Translate API key is **not free**, if you want alternatives you could look at: https://www.npmjs.com/package/google-translate-api-x )

```
GOOGLE_TRANSLATE_API_KEY=...(Set up here: https://cloud.google.com/apis)
```
as well as the Spotify developer account:
```
SPOTIFY_CLIENT_SECRET=... (Set up here: https://developer.spotify.com/documentation/web-api)
```
The final .env would look something like this if you run it locally:
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_TRANSLATE_API_KEY=...
```

I am currently weighing options to make it more accessible for users who want to use the service out of the box. Most legitimate options cost some dollars, and free options come only with significant performance drop. Ideally, we should be able to run everything locally without the need for cloud interactions (except for of course interacting with Spotify) in near future, i.e.
 - Local LLM for translation ((GPT4ALL)[https://github.com/nomic-ai/gpt4all])
 - Local transcription AI (e.g. (Moises.ai)[https://moises.ai/] or finetune Whisper, if there is a reliable way to somehow extract only the vocals out)

 ... or I could host a server with a couple of ads, as long as it aligns with the license agreements... It probably won't in the current state given the Musixmatch API being difficult to obtain.


### Credits

Big Thanks to [Lyrix by BlueCatSoftware](https://github.com/BlueCatSoftware/Lyrix) for providing the lyrics hosting service through Musixmatch.

Chrome extension for Spotify Web Player: https://github.com/sglkc/moegi


### License

MIT License

--


Have questions/feature requests? Start a new (Discussion)[https://github.com/in-c0/spotify-lyrics-translator/discussions] or create a new (Issue)[https://github.com/in-c0/spotify-lyrics-translator/issues]
Feel free to share feedback or contribute by creating a new issue/PR!