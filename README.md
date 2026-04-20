# MVP Forge - iOS Game Lab

A React + Vite product prototype for deconstructing iOS competitor mobile games before building a new MVP.

The app is built around one workflow:

1. Upload an iOS competitor package or supporting files.
2. Connect an AI provider and extract system entrances, economy rows, session loops, and monetization clues.
3. Turn the deconstruction into a small MVP brief.
4. Orchestrate Package, Market, Core Loop, Scope, Tech, and Prototype Agents.
5. Review playtest signals and decide whether to continue, adjust, or stop.

## AI Providers

The browser app can call:

- OpenAI
- MiniMax
- Anthropic Claude
- Google Gemini
- DeepSeek
- Qwen / DashScope
- OpenRouter
- Custom OpenAI-compatible APIs

API keys are stored only in the user's browser local storage. Because this is a static GitHub Pages app, direct browser calls can still be blocked by a provider's CORS policy. For production use with private keys, put a small backend proxy in front of the providers.

IPA binaries are not reverse-engineered inside the browser. The app sends package metadata, file names, sizes, readable supporting text files, and user notes to the selected model. Deep binary/package analysis should be added with a backend or local parser.

## Local Development

```bash
npm install
npm run dev
```

## Local IPA Parser

To enable structured IPA parsing in the browser app, start the bundled local parser in a second terminal:

```bash
npm run parser
```

The frontend probes `http://127.0.0.1:8787/health` and sends uploaded `.ipa` files to `POST /parse-ipa` when the **Use local IPA parser** toggle is on.

## Production Build

```bash
npm run build
npm run preview
```

## Deployment

The repository includes a GitHub Pages workflow. Push to `main`, then enable GitHub Pages with **GitHub Actions** as the source in the repository settings.
