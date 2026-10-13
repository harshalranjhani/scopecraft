# ScopeCraft

**Good work starts with a clear scope.**

A private proposal workspace for independent designers and developers. Turn a client brief into an editable scope, catch the unknowns, put a fair price on your time, and export a proposal you can stand behind.

Built from scratch during [Hacktoberfest 2026 Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12). MIT licensed.

## Try it

- **[Interactive demo](https://harshalranjhani.github.io/scopecraft/)** — editable examples, pricing, scope checks, backups, and PDF/Markdown export. GitHub Pages serves the frontend; it does not run inference. Examples are clearly labeled.

The model generates a new scope. Saved examples let someone inspect the rest of the workflow without downloading weights. There is no template fallback disguised as AI generation.

## Run the complete app locally

Requires Node.js **22.12+**.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Examples work before a model is connected. Drafts and proposals stay in browser storage; export a backup before clearing browser data.

### Optional local AI

The default model is **Qwen3-0.6B**, served by **llama.cpp**. Setup downloads **640 MB of official Q8 source weights, then converts them to a **391 MB Q4 model\***\* and, on Linux x64, a **17 MB runtime archive\*\*. The source weights and runtime are pinned and SHA-256 verified. The larger weights are deleted after conversion; a local checksum verifies the retained model. Nothing downloads during installation, build, or tests.

```sh
# Explicit opt-in download, once:
npm run ai:setup -- --download

# Terminal 1:
npm run ai:start

# Terminal 2:
npm run dev
```

Allow at least **1 GB available RAM** at model startup. Root Linux installations with systemd use a **hard 900 MB memory cap**, a **one-core CPU budget**, one worker, one inference thread, and a 3072-token context. The runtime unloads weights after 60 seconds of inactivity. Other platforms run directly; apply your own limits when hosting. Small-model estimates need human review.

On macOS, install the runtime with `brew install llama.cpp`. On other platforms, put `llama-server` and `llama-quantize` on PATH using the [official releases](https://github.com/ggml-org/llama.cpp/releases). Automatic runtime installation targets Linux x64 with compatible glibc; the weights are downloaded on all platforms.

Initial setup requires internet. Once runtime, weights and dependencies are downloaded, inference and the locally served UI work without internet. Fonts are bundled locally; there is no analytics or external AI request in the default setup.

### Bring your own open model

Copy `.env.example` to `.env`, and change `AI_BASE_URL` and `AI_MODEL` to another **OpenAI-compatible inference server** supporting JSON-schema output. `AI_BASE_URL` is the origin, for example `http://127.0.0.1:8080`, without `/v1`. Default Qwen setup is the primary integration; other servers may support different schema features.

Briefs go from the browser to the app server and then to the configured model server. Privacy depends on where that server runs. A remote model server receives the brief.

## The proposal workflow

1. Paste a client email or notes; set your rate and contingency.
2. Qwen proposes deliverables, hours, exclusions, questions, and scope risks.
3. Review and edit the scope. Prices update as hours and rates change.
4. Inspect private risks and resolve open questions.
5. Preview the client document. Print / save PDF, download Markdown, or copy it.
6. Track Draft / Ready to share / Accepted. These are manual records; nothing is emailed.
7. Export a JSON backup and import proposals on another browser.

Quote totals are calculated in **integer cents**, separately from the model. Estimates include contingency and a suggested 50% deposit, exclude tax, and do not commit to dates. Dashboard quoted value is grouped by the workspace currency.

## Architecture

- React, TypeScript and Vite frontend; Lucide icons; native dialogs.
- Node's built-in HTTP server for inference requests and production static files.
- Zod validation of briefs, output, backups and browser responses.
- llama.cpp schema-constrained inference, with model thinking disabled.
- Browser-local persistence; no account service, database or payment processor.

The model has no tools, filesystem access or contact channel. Client text is untrusted input. Output is validated and rendered as text. Private risks stay out of client exports.

The server allows one generation at a time, aborts on timeout/disconnect, preserves the brief, and reports failures explicitly. It defaults to loopback. Set `APP_TOKEN` in `.env` before exposing live generation to a wider network, then enter it in workspace settings. Browser tokens stay in session memory and are excluded from backups.

## Verify and deploy

```sh
npm test
npm run build
npm start
```

Production runs on **127.0.0.1:3001**. Configure `HOST` and `PORT` in `.env` if needed. Keep the model server on loopback; use an HTTPS reverse proxy for hosted full apps. The GitHub Actions workflow checks and deploys the static demo to GitHub Pages.

Tests cover pricing, export privacy, validation, authentication, malformed origins, output handling, concurrency and backup persistence.

## Credits and limitations

- [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) and [official GGUF](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF): Apache 2.0.
- [llama.cpp](https://github.com/ggml-org/llama.cpp): MIT.
- React, Vite, TypeScript, Zod and Lucide retain their dependency licenses.
- DM Sans and Manrope: SIL Open Font License, bundled in `public/fonts`.

Estimates are starting points, not commitments. ScopeCraft is a proposal tool, not a contract or tax calculator. Browser data does not sync; backups may contain sensitive briefs. There is no billing, e-signature, email sending, or automatic acceptance verification.
