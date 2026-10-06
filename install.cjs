#!/usr/bin/env node
//
// One-time setup for CSCI 5609: installs an `umn-codex` command that runs
// Codex against the UMN AI Gateway.
//
//   node install.js
//
// Works on macOS, Linux and Windows. Needs Node 18 or newer (you already have
// Node, since Codex is installed with npm).
//
// This does NOT touch your personal Codex setup. Your ~/.codex config, your
// ChatGPT login, and your history are never read or written, so plain `codex`
// keeps working exactly as it does now. Everything here lives in ~/.codex-umn
// and can be removed with:
//
//   macOS/Linux   rm -rf ~/.codex-umn ~/.local/bin/umn-codex
//   Windows       rmdir /s /q "%USERPROFILE%\.codex-umn" && del "%USERPROFILE%\.local\bin\umn-codex.cmd"

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const WIN = process.platform === 'win32';
const HOME = os.homedir();
const UMN_HOME = path.join(HOME, '.codex-umn');
const BIN_DIR = path.join(HOME, '.local', 'bin');
const WRAPPER = path.join(BIN_DIR, WIN ? 'umn-codex.cmd' : 'umn-codex');
const ENV_FILE = path.join(UMN_HOME, '.env');
const BASE_URL = 'https://api.aigateway.umn.edu/v1';

// ---------------------------------------------------------------------------
// Models offered to students.
//
//   profile-name | gateway model id | context window | short description
//
// The FIRST entry is the default when you just run `umn-codex`. Every entry
// also becomes a profile, usable as: umn-codex -p <profile-name>
//
// To offer more models later: add a line here and tell students to re-run
// install.js. Nothing else changes.
// ---------------------------------------------------------------------------
const MODELS = [
  'luna|mantle-gpt-5.6-luna|272000|Course default',
  'sol|mantle-gpt-5.6-sol|272000|Stronger, pricier',
];

// --- output helpers --------------------------------------------------------
// Legacy Windows consoles render neither ANSI colour nor U+2713 reliably.
// Windows Terminal (WT_SESSION) does, as do all POSIX terminals.
const FANCY = !WIN || !!process.env.WT_SESSION;
const COLOR = FANCY && process.stdout.isTTY && !process.env.NO_COLOR;

const paint = (code, s) => (COLOR ? `\u001b[${code}m${s}\u001b[0m` : s);
const say = (s = '') => console.log(s);
const ok = (s) => console.log(`  ${paint(32, FANCY ? '✓' : '[ok]')} ${s}`);
const warn = (s) => console.log(`  ${paint(33, FANCY ? '!' : '[!]')} ${s}`);

class Fatal extends Error {}
const die = (s) => { throw new Fatal(s); };

// Resolves to '' if stdin is closed (piped or redirected input) rather than
// hanging forever, so the caller can fall back to an existing key or fail loudly.
function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let done = false;
    const finish = (a) => { if (done) return; done = true; rl.close(); resolve(a); };
    rl.question(prompt, finish);
    rl.on('close', () => { if (!done) { say(''); finish(''); } });
  });
}

// Runs a command and captures everything it printed. Never throws.
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return {
    okay: !r.error && r.status === 0,
    status: r.status,
    out: `${r.stdout || ''}${r.stderr || ''}`,
  };
}

// --- main ------------------------------------------------------------------
async function main() {
  const [maj] = process.versions.node.split('.').map(Number);
  if (maj < 18) {
    die(`this installer needs Node 18 or newer (you have ${process.versions.node}).
       Update Node: https://nodejs.org`);
  }

  say('');
  say('Setting up Codex for CSCI 5609');
  say('------------------------------');

  // --- 1. Codex must be installed ------------------------------------------
  // shell:true so Windows resolves codex.cmd / codex.exe, not just a bare file.
  const ver = run('codex', ['--version'], { shell: true });
  if (!ver.okay) {
    die(`'codex' is not installed or not on your PATH.
       Install it first:  npm install -g @openai/codex
       (Needs Node.js: https://nodejs.org)`);
  }
  ok(`found codex (${ver.out.trim() || 'unknown version'})`);

  // --- 2. API key -----------------------------------------------------------
  fs.mkdirSync(UMN_HOME, { recursive: true });

  let existingKey = '';
  if (fs.existsSync(ENV_FILE)) {
    const m = fs.readFileSync(ENV_FILE, 'utf8').match(/^UMN_API_KEY="?([^"\r\n]*)"?\s*$/m);
    if (m) existingKey = m[1];
  }

  let key = process.argv[2] || '';
  if (!key && existingKey) {
    say('');
    say(`A key is already installed (${existingKey.slice(0, 7)}...). Press Enter to keep it,`);
    say('or paste a new one to replace it.');
    key = (await ask('Key: ')) || existingKey;
  } else if (!key) {
    say('');
    say("Paste the API key you received from the instructor (starts with 'sk-').");
    key = await ask('Key: ');
  }

  // Trim whitespace and stray surrounding quotes from a sloppy paste
  key = key.replace(/\s+/g, '').replace(/^"|"$/g, '');
  if (!key) die('no key entered. Re-run: node install.js');
  if (!key.startsWith('sk-')) {
    warn("that key does not start with 'sk-' — continuing, but double-check it.");
  }

  // Written unquoted so both the POSIX and the Windows wrapper can parse it.
  fs.writeFileSync(ENV_FILE, `UMN_API_KEY=${key}\n`, { mode: 0o600 });
  lockDown(ENV_FILE);

  // --- 3. Which models does this key actually allow? ------------------------
  let allowed = [];
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    allowed = (body.data || []).map((m) => m && m.id).filter(Boolean);
    if (allowed.length) ok(`your key can use: ${allowed.join(' ')}`);
  } catch {
    warn('could not list models for your key (continuing anyway)');
  }

  // --- 4. Codex config + one profile per model ------------------------------
  let defaultModel = '';
  let defaultWindow = '';
  for (const entry of MODELS) {
    const [pname, pmodel, pwindow, pdesc] = entry.split('|');
    if (!defaultModel) { defaultModel = pmodel; defaultWindow = pwindow; }

    fs.writeFileSync(path.join(UMN_HOME, `${pname}.config.toml`),
`# Profile "${pname}" — ${pdesc}
# Use with:  umn-codex -p ${pname}
model = "${pmodel}"
model_context_window = ${pwindow}
`);

    if (allowed.length && !allowed.includes(pmodel)) {
      warn(`profile '${pname}' uses ${pmodel}, which your key cannot access`);
    }
  }
  ok(`wrote ${MODELS.length} model profile(s) to ${UMN_HOME}`);

  fs.writeFileSync(path.join(UMN_HOME, 'config.toml'),
`# Codex config for CSCI 5609 — used only by the \`umn-codex\` command.
# Your personal ~/.codex/config.toml is untouched.
#
# Re-run install.js at any time to restore this file.

model = "${defaultModel}"
model_provider = "umn"
model_context_window = ${defaultWindow}

[model_providers.umn]
name = "UMN AI Gateway"
base_url = "${BASE_URL}"
env_key = "UMN_API_KEY"
wire_api = "responses"
`);
  ok(`wrote ${path.join(UMN_HOME, 'config.toml')} (default model: ${defaultModel})`);

  // --- 5. The umn-codex command ---------------------------------------------
  fs.mkdirSync(BIN_DIR, { recursive: true });
  fs.writeFileSync(WRAPPER, WIN ? windowsWrapper() : posixWrapper(), { mode: 0o755 });
  ok(`installed ${WRAPPER}`);

  // --- 6. PATH ---------------------------------------------------------------
  addToPath();

  // --- 7. Verify -------------------------------------------------------------
  say('');
  say('Testing the connection...');
  const args = ['exec', '--skip-git-repo-check', 'reply with exactly: ok'];
  const test = WIN
    ? run('cmd.exe', ['/c', WRAPPER, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    : run(WRAPPER, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  if (!test.okay) {
    say('');
    die(`could not reach the gateway. Output:\n${tail(test.out, 15)}`);
  }
  if (/(^|[^a-z])ok([^a-z]|$)/i.test(test.out)) {
    ok('the gateway responded — setup is working');
  } else {
    warn('Codex ran but the reply was unexpected. Full output:');
    say(tail(test.out, 15));
  }

  // --- done ------------------------------------------------------------------
  say('');
  say('Done. From now on, inside any project folder, run:');
  say('');
  say('    umn-codex');
  say('');
  if (MODELS.length > 1) {
    say('To pick a different model:');
    say('');
    for (const entry of MODELS) {
      const [pname, , , pdesc] = entry.split('|');
      say(`    umn-codex -p ${pname.padEnd(10)} ${pdesc}`);
    }
    say('');
  }
  say("Do NOT use the /model command inside Codex — it lists OpenAI's own models,");
  say('which the UMN gateway will reject. Use the -p option above instead.');
  say('');
  say("Use 'umn-codex' for coursework and plain 'codex' for everything else.");
  say('');
}

function tail(s, n) {
  return s.trimEnd().split('\n').slice(-n).join('\n');
}

// chmod 600 is a no-op on NTFS, so on Windows strip inherited ACLs and grant
// the current user alone. Otherwise the "readable only by you" claim is false.
function lockDown(file) {
  if (!WIN) {
    ok(`saved your key to ${file} (readable only by you)`);
    return;
  }
  const r = run('icacls', [file, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`]);
  if (r.okay) {
    ok(`saved your key to ${file} (readable only by you)`);
  } else {
    ok(`saved your key to ${file}`);
    warn('could not restrict file permissions; other accounts on this PC may read it');
  }
}

function posixWrapper() {
  return `#!/usr/bin/env bash
# Runs Codex against the UMN AI Gateway. Installed by the CSCI 5609 setup.
set -euo pipefail

UMN_HOME="\${UMN_CODEX_HOME:-$HOME/.codex-umn}"

if ! command -v codex >/dev/null 2>&1; then
  echo "error: 'codex' is not installed. Run: npm install -g @openai/codex" >&2
  exit 1
fi
if [ ! -f "$UMN_HOME/.env" ]; then
  echo "error: course setup not found in $UMN_HOME" >&2
  echo "       re-run the installer: node install.js" >&2
  exit 1
fi

export CODEX_HOME="$UMN_HOME"
set -a
# shellcheck disable=SC1091
. "$UMN_HOME/.env"
set +a

if [ -z "\${UMN_API_KEY:-}" ]; then
  echo "error: UMN_API_KEY is not set in $UMN_HOME/.env" >&2
  echo "       re-run the installer: node install.js" >&2
  exit 1
fi

exec codex "$@"
`;
}

// Note: no `enabledelayedexpansion` -- it would mangle a key containing "!".
// `call` is required because npm installs codex as codex.cmd; without it,
// control never returns here and the exit code is lost.
function windowsWrapper() {
  return `@echo off
REM Runs Codex against the UMN AI Gateway. Installed by the CSCI 5609 setup.
setlocal

set "UMN_HOME=%UMN_CODEX_HOME%"
if not defined UMN_HOME set "UMN_HOME=%USERPROFILE%\\.codex-umn"

where codex >nul 2>nul
if errorlevel 1 (
  echo error: 'codex' is not installed. Run: npm install -g @openai/codex 1>&2
  exit /b 1
)

if not exist "%UMN_HOME%\\.env" (
  echo error: course setup not found in %UMN_HOME% 1>&2
  echo        re-run the installer: node install.js 1>&2
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%UMN_HOME%\\.env") do set "%%A=%%B"

if not defined UMN_API_KEY (
  echo error: UMN_API_KEY is not set in %UMN_HOME%\\.env 1>&2
  echo        re-run the installer: node install.js 1>&2
  exit /b 1
)

set "CODEX_HOME=%UMN_HOME%"
call codex %*
exit /b %errorlevel%
`;
}

function addToPath() {
  const sep = WIN ? ';' : ':';
  const onPath = (process.env.PATH || '').split(sep).includes(BIN_DIR);
  if (onPath) { ok(`${BIN_DIR} is already on your PATH`); return; }

  if (WIN) { addToWindowsPath(); return; }

  const shell = path.basename(process.env.SHELL || '');
  let rc = '';
  if (shell === 'zsh') {
    rc = path.join(HOME, '.zshrc');
  } else if (shell === 'bash') {
    const profile = path.join(HOME, '.bash_profile');
    rc = fs.existsSync(profile) ? profile : path.join(HOME, '.bashrc');
  }

  const line = 'export PATH="$HOME/.local/bin:$PATH"';
  if (!rc) {
    warn('could not detect your shell config. Add this line to it yourself:');
    say(`      ${line}`);
    return;
  }
  if (fs.existsSync(rc) && fs.readFileSync(rc, 'utf8').includes('.local/bin')) {
    ok(`${BIN_DIR} already referenced in ${rc}`);
  } else {
    fs.appendFileSync(rc, `\n# added by CSCI 5609 Codex setup\n${line}\n`);
    ok(`added ${BIN_DIR} to your PATH in ${rc}`);
  }
  warn(`open a NEW terminal (or run: source ${rc}) before using umn-codex`);
}

// Deliberately not `setx`: it silently truncates PATH at 1024 characters.
// The target is passed through the environment to avoid quoting problems with
// usernames that contain spaces.
function addToWindowsPath() {
  const script = `
$t = $env:UMN_TARGET_DIR
$p = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $p) { $p = '' }
$parts = @($p -split ';' | Where-Object { $_ -ne '' })
if ($parts -contains $t) { 'present' } else {
  [Environment]::SetEnvironmentVariable('Path', (($parts + $t) -join ';'), 'User')
  'added'
}`;
  const r = run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    env: { ...process.env, UMN_TARGET_DIR: BIN_DIR },
  });

  if (!r.okay) {
    warn('could not update your PATH automatically. Run this in PowerShell:');
    say(`      [Environment]::SetEnvironmentVariable('Path',`);
    say(`        [Environment]::GetEnvironmentVariable('Path','User') + ';${BIN_DIR}', 'User')`);
    return;
  }
  if (r.out.includes('present')) {
    ok(`${BIN_DIR} already on your user PATH`);
  } else {
    ok(`added ${BIN_DIR} to your user PATH`);
  }
  warn('open a NEW terminal before using umn-codex');
}

main().catch((e) => {
  if (e instanceof Fatal) {
    console.error(`${paint(31, 'error:')} ${e.message}`);
  } else {
    console.error(`${paint(31, 'error:')} ${e && e.stack ? e.stack : e}`);
  }
  process.exit(1);
});
