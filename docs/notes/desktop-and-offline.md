# Later: desktop app and offline lite version

Saved 26 Sept 2026 for after the web app ships. Focus now: the web app.

---

Yes to both, but they're very different amounts of work. A desktop app that needs internet is easy. An offline version is a second product with its own architecture.

## 1. A desktop app that needs internet (easy)

Wrap the web app in a desktop shell:

- **Tauri** uses the computer's built-in web view, so installers are small (a few MB) and it runs well on weak machines. Tauri 2 can also target mobile.
- **Electron** bundles its own Chromium, so it's heavier (100 MB+) but more predictable across systems.

Both can load your Next.js app, and you get an installer for Windows, macOS and Linux. This is also where the full embedded browser for research and the stronger anti-cheat become possible, as we discussed earlier.

Extra costs to plan for:
- **Code signing:** Apple's developer program is about $99 a year, and Windows signing certificates also cost money yearly. Without them users get scary warnings, which is why INDEX 0 asks people to click through security prompts.
- **Auto-updates:** you'll need a way to ship new versions.

AI can write most of this wrapper for you. It's a well-trodden path.

## 2. An offline "lite" version (possible, but a different product)

Almost every piece of your current stack assumes internet:

| Piece | Online version | Offline version needs |
|---|---|---|
| Auth | Clerk | No login, just a local profile |
| Backend and data | Convex (cloud) | A local database (SQLite) in the app |
| Code runner | Judge0 on a Linux server | Code runs on the user's own machine |
| Docs library | Hosted in Convex | Bundled into the app (attribution lines kept) |
| AI coach | Cloud model | A local model, or none |
| Duels, contests, rankings | Realtime server | Not possible offline |

**Running code locally** is the hardest part:
- **Web languages:** JavaScript and TypeScript run directly in the app.
- **Python:** can run inside the app through Pyodide (Python compiled to WebAssembly), with no install needed.
- **C++, Java, C#:** you'd have to bundle compilers, which makes the app large, or ask users to install them.

A realistic lite version starts with JavaScript, TypeScript and Python only.

**The AI coach conflicts with your goal.** INDEX 0 runs a local model through Ollama and asks for 8 to 16 GB of RAM. People with weak computers can't run that. So the lite version should either have no coach, or use hand-written hints stored with each problem. The hints work on any machine.

**Problems shipped in the app are exposed.** Anything you put in the download can be extracted, including hidden tests. So the offline pack must only contain practice problems, never problems used in ranked duels or contests. Otherwise people could study the hidden tests and cheat online.

**Optional syncing:** when the user does get internet, the app could upload their solved problems and progress to their online account. Offline solves should never change their rating.

## 3. One-time payment or free?

I'd think twice about charging for it:
- **It conflicts with who it's for.** People without reliable internet often also lack international cards or easy online payment, so a paid download may not reach them.
- **It only contains free content.** Charging a one-time fee for an offline copy of what's free online is a hard sell.
- **INDEX 0 is free and funded by donations and mentoring.** That model fits this audience.

Better options:
- **Free lite version,** paid for by Pro and organization revenue. You could frame it as your mission and use it in marketing.
- **Pay-what-you-want,** with free as a valid choice.
- **Sponsorship:** a company or NGO sponsors copies for schools, delivered on USB drives or school networks, since a large download is itself a barrier where internet is poor.
- Keep regional pricing for Pro online.

## 4. What to do now so this is cheap later

A few decisions in the first version make both desktop versions much easier:

1. **Problem format as plain files.** Store statements, tests and hints in a portable format (JSON plus markdown), not only as Convex records, so you can export a practice pack.
2. **Code runner behind an interface.** Write something like `runCode(code, lang, tests)` with a Judge0 implementation now. Later you add a local implementation (Pyodide, JavaScript workers) without touching the UI.
3. **Data access behind a thin layer.** Keep Convex calls in hooks or services rather than scattered through components, so a local SQLite version can replace them for offline screens.
4. **Hand-written hints per problem.** Worth doing anyway: they work offline, cost nothing, and back up the AI coach.

So: the online desktop app is a few weeks of work once the web app exists. The offline lite version is realistic if you limit it to practice, a few languages and no AI, and plan for it with the four points above.
