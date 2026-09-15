#!/usr/bin/env python3
"""
Spawn Plutus Tile — Copilot Tile Protocol helper.
Uses Collaborator IPC socket to create and manage container tiles.
Usage: python3 scripts/spawn-plutus-tile.py <container-name> <project-name>
"""
import socket, json, time, os, subprocess, sys

PROJECT = sys.argv[2] if len(sys.argv) > 2 else "plutus"
CONTAINER = sys.argv[1] if len(sys.argv) > 1 else f"{PROJECT}-container"
ST = f"/tmp/{CONTAINER}/stream.txt"
IPC = os.path.expanduser("~/.collaborator/ipc.sock")

def ipc(method, params=None):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(10); s.connect(IPC)
    req = {"jsonrpc": "2.0", "id": "1", "method": method}
    if params: req["params"] = params
    s.sendall(json.dumps(req).encode() + b"\n")
    f = s.makefile("rb"); line = f.readline(); f.close(); s.close()
    return json.loads(line.decode())

# 1. Verify container exists
r = subprocess.run(["docker","ps","--filter",f"name={CONTAINER}","--format","{{.Names}}"], capture_output=True, text=True)
if CONTAINER not in r.stdout:
    print(f"CONTAINER_NOT_FOUND:{CONTAINER}")
    sys.exit(1)

# 2. Kill any existing opencode process inside container
subprocess.run(["docker","exec",CONTAINER,"sh","-c","kill -9 $(pgrep -f /usr/local/bin/opencode) 2>/dev/null"], capture_output=True)

# 3. Disconnect any existing tmux client
subprocess.run(["tmux","disconnect-client","-t",CONTAINER], capture_output=True)

# 4. Create tile via IPC
r = ipc("canvas.tileCreate", {"tileType": "term"})
tile_id = r.get("result",{}).get("tileId","")
if not tile_id:
    print(f"IPC_FAILED:{r}")
    sys.exit(1)
print(f"TILE_CREATED:{tile_id}")

# 5. Move tile to bottom of canvas
ipc("canvas.tileMove", {"tileId": tile_id, "position": {"x": 0, "y": 1080}})

# 6. Wait for shell init
time.sleep(2)

# 7. cd to workspace
ipc("canvas.terminalWrite", {"tileId": tile_id, "input": "cd ~/OPENCODE_WORKSPACE\n"})
time.sleep(1)

# 8. Create tmux session (inherits CWD from cd)
ipc("canvas.terminalWrite", {"tileId": tile_id, "input": f"tmux new-session -d -s {CONTAINER} 2>&1; exec tmux attach-session -t {CONTAINER}\n"})
time.sleep(3)

# 9. Wire pipe-pane for continuous output streaming
os.makedirs(f"/tmp/{CONTAINER}", exist_ok=True)
open(ST,"w").close()
subprocess.run(["tmux","pipe-pane","-t",f"{CONTAINER}:0"], capture_output=True)
time.sleep(0.3)
subprocess.run(["tmux","pipe-pane","-t",f"{CONTAINER}:0","-o",f"cat >> {ST}"], capture_output=True)

# 10. Launch opencode inside container via tmux
subprocess.run(["tmux","send-keys","-t",f"{CONTAINER}:0",f"cd ~/OPENCODE_WORKSPACE && docker exec -it {CONTAINER} /usr/local/bin/opencode --agent {PROJECT} 2>&1; bash","Enter"])

# 11. Wait for TUI to load
time.sleep(12)
r = subprocess.run(["strings",ST], capture_output=True, text=True)
if "Ask anything" in r.stdout:
    print(f"TILE_READY:{tile_id}")
else:
    print(f"TILE_LOADING:{tile_id}")
