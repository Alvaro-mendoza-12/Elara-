#!/bin/sh
set -eu
base=/home/alvaro/elara-runtime
image=ghcr.io/ggml-org/whisper.cpp@sha256:9eb20c118f018120f1c57e42cbdd7c5b58fc3d2d7a51ba00abeeab80b913f47f
if ! docker inspect elara-speech >/dev/null 2>&1; then
 docker run -d --name elara-speech --restart unless-stopped --network elara-runtime --user "$(id -u):$(id -g)" --cpus=2 --memory=768m --memory-swap=768m --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only --log-driver=none --tmpfs /tmp:rw,nosuid,nodev,size=32m --workdir /tmp -v "$base/models:/models:ro" --entrypoint /app/build/bin/whisper-server "$image" -m /models/ggml-base.bin --host 0.0.0.0 --port 8081 --convert --tmp-dir /tmp --public /app/examples/server/public -t 2 -p 1 -l es -d 30000 -bo 1 -bs 1 -ng -nt -sns
fi
