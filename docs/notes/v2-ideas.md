# V2 ideas

Saved 26 Sept 2026. Not part of the first web app release.

See also: `desktop-and-offline.md` (desktop app and offline lite version).

---

## Free roam: pick a language and build anything

Yes, and most of it can run in the user's browser, so it costs you almost nothing to host. The limits depend on the language.

### What can run in the browser for free

This is code running on the user's own machine, inside the page. No server of yours runs it, so there's no hosting bill and no sandbox to maintain.

| Project type | How | Notes |
|---|---|---|
| Websites (HTML, CSS, JS) | Live preview in a sandboxed iframe | The easiest part. Works like CodePen. |
| JavaScript / TypeScript terminal apps | Web Worker, plus a fake terminal (xterm.js) | TypeScript is compiled in the browser. |
| Python terminal apps | Pyodide (Python compiled to WebAssembly) | Includes many packages, like numpy. `input()` needs extra setup (see below). |
| SQL | SQLite in WebAssembly (sql.js) | Good for learning databases. |
| Ruby, PHP, Lua | WebAssembly builds exist | Less polished; add later if people ask. |
| C, C++, Java, C# | Possible in WebAssembly, but heavy (large downloads) | Better through your server runner (below). |

Two technical notes:
- **Interactive terminal input** (a Python `input()` that waits for the user) needs the page served with special security headers so the worker can pause and wait. That's doable in Next.js, but plan for it.
- **WebContainers** (from StackBlitz) can run real Node.js with npm in the browser, which is great for web projects. Check their license for commercial use before relying on it.

### Languages that need a server

For C++, Java and C#, reuse the Judge0 runner you're building anyway, in batch mode: the user writes code and optional input, presses Run, and gets the output back. No live terminal, no network, strict time and memory limits, and a daily run quota. That costs you a little compute but no extra service.

A full Replit-style experience is where it gets expensive: a real Linux terminal, installing any package, and servers that keep running. Each user needs their own container, and hosting that for free invites crypto mining and spam. I wouldn't offer that for free, and probably not in the first version at all.

### Two risks to plan for

- **Websites as phishing pages.** If people can share or publish websites they build, some will build fake login pages. Keep previews on a separate domain, don't offer public hosting at first, and add reporting if you do.
- **Storage.** Projects are small text files, so saving them in Convex is cheap. Set size and project-count limits anyway.

### How it fits the plan

- **Free:** Free roam with browser languages (Web, JS/TS, Python, SQL) and server-run C++, Java and C# with a daily quota.
- **Pro:** more storage and projects, higher run quotas, private projects. The AI coach works here too, since it's already Pro.

This also connects to the offline plan. The browser runner you'd build for free roam (Pyodide, JavaScript workers) is the same one the offline lite version needs. Building free roam first makes the desktop version cheaper later.
