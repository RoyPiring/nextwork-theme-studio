"""Pineapple Theme Studio · companion voice: Kokoro, an open neural voice that runs on this computer.

Reads one line of text on stdin and writes a WAV to stdout, which is what the
companion helper's --voice expects. Nothing leaves the machine.

    pip install kokoro-onnx
    (download kokoro-v1.0.onnx and voices-v1.0.bin once, into one folder)
    node companion-host/install.js --extension <id> --voice "python companion-host/kokoro-say.py --dir C:\\voices\\kokoro --voice am_michael"

Voices: am_michael, am_adam (American men), af_heart, af_bella (American
women), bm_george (British man), and more in voices-v1.0.bin.
"""
import argparse
import io
import os
import sys
import wave


def main():
    ap = argparse.ArgumentParser(description='Say a line with Kokoro: text on stdin, WAV on stdout.')
    ap.add_argument('--dir', required=True, help='the folder holding kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--voice', default='am_michael')
    ap.add_argument('--speed', type=float, default=1.0)
    ap.add_argument('--lang', default='en-us')
    a = ap.parse_args()
    text = sys.stdin.read().strip()[:220]
    if not text:
        return 1
    import numpy as np
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(a.dir, 'kokoro-v1.0.onnx'), os.path.join(a.dir, 'voices-v1.0.bin'))
    samples, rate = k.create(text, voice=a.voice, speed=a.speed, lang=a.lang)
    pcm = (np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes()
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    sys.stdout.buffer.write(buf.getvalue())
    sys.stdout.buffer.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
