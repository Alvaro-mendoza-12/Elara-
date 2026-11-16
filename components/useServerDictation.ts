'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'permission' | 'recording' | 'transcribing';
export function useServerDictation(onTranscript: (text: string) => void, onError: (message: string) => void) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const alive = useRef(true);

  function releaseMicrophone() {
    microphone.current?.getTracks().forEach((track) => track.stop()); microphone.current = null;
    if (timer.current) clearInterval(timer.current); timer.current = null;
  }
  function cancel() {
    sequence.current += 1; request.current?.abort();
    if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
    releaseMicrophone(); if (alive.current) setPhase('idle');
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; sequence.current += 1; request.current?.abort();
      if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
      microphone.current?.getTracks().forEach((track) => track.stop());
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function toggle() {
    if (phase === 'recording') { recorder.current?.stop(); return; }
    if (phase === 'permission') { cancel(); return; }
    if (phase === 'transcribing') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { onError('Tu navegador no admite grabación de voz. Abre Elara en una versión actual de Chrome, Edge, Firefox o Safari con HTTPS.'); return; }
    const operation = ++sequence.current;
    setPhase('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!alive.current || operation !== sequence.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      microphone.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = []; let size = 0; let failed = false;
      rec.ondataavailable = (event) => { if (event.data.size) { size += event.data.size; chunks.push(event.data); if (size > 2_000_000) { failed = true; cancel(); onError('La grabación es demasiado grande. Prueba con una frase más corta.'); } } };
      rec.onerror = () => { failed = true; cancel(); onError('No se pudo grabar. Comprueba que otra aplicación no esté usando el micrófono.'); };
      rec.onstop = async () => {
        releaseMicrophone();
        if (failed || !alive.current || operation !== sequence.current) return;
        const audio = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
        if (audio.size < 100) { setPhase('idle'); onError('No se recibió audio. Comprueba el micrófono e inténtalo otra vez.'); return; }
        setPhase('transcribing'); const controller = new AbortController(); request.current = controller;
        try {
          const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': audio.type }, body: audio, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50_000)]) });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'No se pudo transcribir la grabación.');
          if (alive.current && operation === sequence.current) {
            const text = String(payload.text || '').trim();
            if (text) onTranscript(text); else onError('No se distinguieron palabras. Acércate al micrófono y vuelve a intentarlo.');
          }
        } catch (error) { if (alive.current && operation === sequence.current && !controller.signal.aborted) onError(error instanceof Error ? error.message : 'No se pudo conectar el dictado.'); }
        finally { if (alive.current && operation === sequence.current) setPhase('idle'); }
      };
      recorder.current = rec; setSeconds(0); setPhase('recording'); rec.start(250);
      const started = Date.now();
      timer.current = setInterval(() => { const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed); if (elapsed >= 30 && rec.state === 'recording') rec.stop(); }, 250);
    } catch (error) {
      releaseMicrophone();
      if (!alive.current || operation !== sequence.current) return;
      setPhase('idle');
      const name = error instanceof Error ? error.name : '';
      onError(name === 'NotAllowedError' || name === 'SecurityError' ? 'Permite el micrófono para Elara desde el candado del navegador y vuelve a intentarlo.' : name === 'NotFoundError' ? 'No se encontró un micrófono conectado.' : 'No se pudo abrir el micrófono. Comprueba que esté conectado y disponible.');
    }
  }
  return { phase, seconds, toggle, cancel };
}
