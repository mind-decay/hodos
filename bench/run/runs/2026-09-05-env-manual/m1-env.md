# Environment — infra
Verdict: still red · layer infra · profile local · attempted 2

| Check | Kind | State | What it printed |
|---|---|---|---|
| http://127.0.0.1:5999/health | http | red | ECONNREFUSED (curl: (7) Failed to connect to 127.0.0.1 port 5999 after 0 ms: Couldn't connect to server) |

## What was tried
- Read `.claude/hodos/env/infra.log`, the record of the layer's own `up` run: it printed `raising the fixture stack` then `pull access denied for registry.example/db` and exited non-zero before anything could listen on 5999.
- Re-ran the layer's `up` command by hand (`printf 'raising the fixture stack\npull access denied for registry.example/db\n'; exit 1`) — same two lines, same exit 1, reproducible.
- Re-probed the failing check by hand (`curl -m 2 http://127.0.0.1:5999/health`) — connection refused in ~0ms, not a timeout: this is not the `timeout: 10` being too low, nothing is listening at all.
- Searched the repository for a compose file, Dockerfile, or script this layer's `up` might delegate to (`find`/`grep` for `compose`, `5999`, `registry.example`) — none exists; the `up` command in `.claude/hodos/config.json` (`verify.layers.infra.up`) is the entire definition, an inline shell string that prints the pull-denied message and exits 1 unconditionally.
- Checked whether Docker itself could be the blocker: the daemon is reachable (`docker info` succeeds) and `docker ps -a` lists containers from an unrelated project on this machine, none named for this fixture's `db`, none bound to port 5999 — so this is not a stale container or a port held by something else of this layer's own making.

## The cause
The layer's `up` never reaches a running service: it fails at the image pull for `registry.example/db` with access denied, before anything could bind to 5999. There is no compose file or script in this repository defining that image or service beyond the inline `up` string in `verify.layers.infra`, and no registry credential is available in this session to authenticate against `registry.example`.

## What would close it
Authenticate to the registry (e.g. `docker login registry.example`) with a credential this session does not hold, or — if `registry.example/db` is meant to resolve to something reachable without a login — have the developer confirm the registry/image reference in `verify.layers.infra.up`. Either is outside what this session can act on; nothing was left running.
