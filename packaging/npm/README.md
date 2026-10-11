# @closedsi/closiro

> Closiro (formerly Snailer): an AI coding agent for your terminal

[![npm version](https://img.shields.io/npm/v/@closedsi/closiro.svg)](https://www.npmjs.com/package/@closedsi/closiro)

This package installs the Closiro CLI. It downloads the native binary for your
platform from [GitHub Releases](https://github.com/closedsi-engineering/closiro-agent/releases),
checks it against the release checksums, and puts it on your PATH.

## Install

```bash
npm install -g @closedsi/closiro
```

Or run it without installing:

```bash
npx @closedsi/closiro@latest --help
```

Both `closiro` and `snailer` start the same CLI, so existing scripts keep working.

> Moving from `@snailer-team/snailer`? Uninstall it first so the two packages
> don't both provide the `snailer` command:
> `npm uninstall -g @snailer-team/snailer && npm install -g @closedsi/closiro`

## Setup

Set an API key for the model provider you use:

```bash
export CLAUDE_API_KEY="your-api-key"   # Claude (recommended)
export OPENAI_API_KEY="your-api-key"   # OpenAI
export XAI_API_KEY="your-api-key"      # xAI
```

## Usage

```bash
closiro                                   # interactive mode
closiro --prompt "Add error handling to the API module"   # one-shot
closiro --help
```

## Supported platforms

| OS | Architecture |
|---|---|
| macOS | Apple Silicon (arm64), Intel (x64) |
| Linux | x64 |
| Windows | x64 |

Linux arm64 has no prebuilt binary yet; the install stops with a message listing the supported platforms.

## Offline or restricted networks

Skip the download during install:

```bash
CLOSIRO_SKIP_POSTINSTALL=1 npm install -g @closedsi/closiro
```

Then download the archive for your platform from
[Releases](https://github.com/closedsi-engineering/closiro-agent/releases), and extract
the `closiro` binary (`snailer` for releases before v2.38.0) into the package's `bin/` directory
(`$(npm root -g)/@closedsi/closiro/bin/`).

`CLOSIRO_REPO=owner/name` downloads from a fork or mirror instead. The older
`SNAILER_*` variable names still work.

## Troubleshooting

- **Download fails:** the error shows the exact URL. Download it manually as described above.
- **`closiro: command not found`:** make sure npm's global bin directory is on your PATH (`npm prefix -g`).
- **Checksum mismatch:** the download was corrupted or altered. Run the install again; if it keeps failing, open an issue.

## License

The installer in this package is MIT licensed. The Closiro binary is covered by its own
[End User License Agreement](https://github.com/closedsi-engineering/closiro-agent/blob/main/EULA.md),
included in this package as `EULA.md`. By installing, you agree to both.

## Links

- [Repository](https://github.com/closedsi-engineering/closiro-agent)
- [Issues](https://github.com/closedsi-engineering/closiro-agent/issues)
