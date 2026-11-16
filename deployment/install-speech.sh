#!/bin/sh
set -eu
base=/home/alvaro/elara-runtime
mkdir -p "$base/models"
model="$base/models/ggml-base.bin"
if [ ! -f "$model" ]; then
 curl --fail --location --retry 2 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin' -o "$model.part"
 echo '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe  /home/alvaro/elara-runtime/models/ggml-base.bin.part' | sha256sum --check
 mv "$model.part" "$model"
fi
echo '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe  /home/alvaro/elara-runtime/models/ggml-base.bin' | sha256sum --check
echo SPEECH_MODEL_READY
