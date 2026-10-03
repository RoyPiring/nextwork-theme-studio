# Companion host: a local model for your companion

The companion on nextwork.ai works on its own: it wanders, cheers, nudges you
when you go still on a project, and speaks from its own lines. This folder
gives it a model to talk with: a small program on your computer that the
browser starts when you ask your companion something.

## How it stays local

- The extension never opens a connection. It hands your question to the
  browser, and the browser hands it to this program through **native
  messaging**, by name, and only because you registered it.
- Native messaging is an **optional** permission. The extension asks for it
  when you press **Tie in your model**, and you can remove it with
  **Disconnect**.
- This program answers with **Ollama on this computer** (the address must be
  localhost), or with **a command-line AI you name** at install. The page
  cannot choose a command or a file.
- What goes to the model: your question, the project and section you are on,
  your focus minutes, and, if you gave it a repo, that repo's name, branch,
  last eight commit subjects, package description and the start of its README.
  Nothing else is read.
- Everything about your machine (paths, the extension's id, your repo) is
  written to `companion-host/.local/`, which git ignores.

## Set it up

1. Install [Ollama](https://ollama.com) and pull a small model:

   ```
   ollama pull gemma3:4b
   ```

2. Open a terminal **in the folder you loaded the extension from** (`cd` into it
   first), then register the helper with your extension's id.
   The popup shows the exact command under **Companion**, **Tie in your model**.

   ```
   node companion-host/install.js --extension <your extension id>
   ```

   Options:

   | Option | What it does |
   |---|---|
   | `--repo "C:\path\to\project"` | gives the companion that project's context |
   | `--model qwen3:1.7b` | any model you have pulled (default `gemma3:4b`) |
   | `--command "your-cli --print"` | use any command-line AI instead of Ollama; it gets the prompt on stdin and answers on stdout |
   | `--ollama http://127.0.0.1:11434` | a different local Ollama port |

3. In the popup, press **Tie in your model**. Allow the permission. The status
   line says which model answered.

## Give it a voice

In the popup, under **Its voice**:

- **This computer** uses the voices already installed (on Windows: David,
  Zira, Mark). Only voices that run on this computer are listed; online
  voices are left out because they send the words away.
- **Neural** uses a local neural voice through this helper, such as
  [Piper](https://github.com/OHF-Voice/piper1-gpl). Download a voice once, then
  reinstall with `--voice`:

  ```
  piper --download-model en_US-amy-medium --download-dir C:\voices
  node companion-host/install.js --extension <id> --voice "piper -m C:\voices\en_US-amy-medium.onnx"
  ```

  Any text-to-speech command works if it reads the line on stdin and writes a
  WAV to stdout. Try it with `node companion-host/host.js --say "Hello"`,
  which writes `.local/say-test.wav`. Until a voice is set up, Neural falls
  back to this computer's voice.

Browsers only let a page speak after you have clicked or typed on it, so the
first line after loading may be silent.

## Check it

Run `node companion-host/host.js --selftest` to check it from a terminal, or
`node companion-host/host.js --ask "your question"` to ask once.

To remove it: `node companion-host/install.js --uninstall`.

## Notes

- Chrome, Edge and Brave on Windows, macOS and Linux. Firefox needs its own
  host file and is not covered yet.
- The first question after Ollama starts can take a minute while the model
  loads. After that, answers come in seconds, and the model stays loaded for
  thirty minutes.
- An unpacked extension's id changes if you load it from a different folder.
  If the popup shows a different id, run the install command again.
