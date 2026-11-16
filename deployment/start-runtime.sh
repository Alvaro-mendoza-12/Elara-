#!/bin/sh
set -eu
base=/home/alvaro/elara-runtime
model_image=$(cat "$base/llama-image-lock.txt")
if ! docker inspect elara-model >/dev/null 2>&1; then
 docker run -d --name elara-model --restart unless-stopped --network elara-runtime --user "$(id -u):$(id -g)" --cpus=2.5 --memory=3g --memory-swap=3g --pids-limit=256 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp:rw,nosuid,nodev,size=128m -v "$base/models:/models:ro" -v "$base/secrets:/run/secrets:ro" "$model_image" -m /models/Qwen3.5-2B-Q4_K_M.gguf -c 4096 -t 3 -tb 3 -np 1 -ngl 0 -n 256 --no-webui --api-key-file /run/secrets/api-key --reasoning off --reasoning-budget 0 --chat-template-kwargs '{"enable_thinking":false}' --host 0.0.0.0 --port 8080 --jinja
fi
if ! docker inspect elara-inference-gateway >/dev/null 2>&1; then
 docker run -d --name elara-inference-gateway --restart unless-stopped --network elara-runtime --user "$(id -u):$(id -g)" --cpus=.25 --memory=192m --memory-swap=192m --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only -p 127.0.0.1:3091:3091 -v "$base/inference-gateway.mjs:/app/gateway.mjs:ro" -v "$base/secrets:/run/secrets:ro" node@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 node --max-old-space-size=96 /app/gateway.mjs
fi
if [ ! -f "$base/funnel-before.json" ]; then tailscale funnel status --json > "$base/funnel-before.json"; fi
tailscale funnel --bg --set-path=/elara-inference http://127.0.0.1:3091
