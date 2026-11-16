import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCodeSnippet } from '../lib/elara-engine/code-analyzer';
import { runElaraCoreEngine } from '../lib/elara-engine/engine';

test('elara engine responds honestly on identity and Novvin integration', () => {
  const idRes = runElaraCoreEngine([{ role: 'user', text: 'Quien eres y que es Elara?' }]);
  assert.match(idRes.reply, /ELARA/i);
  assert.match(idRes.reply, /Elara Core v0\.1/);

  const novvinRes = runElaraCoreEngine([{ role: 'user', text: 'Como se conecta con Novvin e iniciar sesion?' }]);
  assert.match(novvinRes.reply, /Continuar con Novvin/i);
});

test('elara engine generates parameterized index.html and handles follow-up edits', () => {
  const first = runElaraCoreEngine([{ role: 'user', text: 'Crea un index.html moderno para Novvin' }]);
  assert.match(first.reply, /```html\n<!DOCTYPE html>/);
  assert.match(first.reply, /Novvin/);

  const followUp = runElaraCoreEngine([
    { role: 'user', text: 'Crea un index.html moderno para Novvin' },
    { role: 'assistant', text: first.reply },
    { role: 'user', text: 'Cambia a tema claro para "Brisa"' },
  ]);
  assert.match(followUp.reply, /#f8fafc/);
  assert.match(followUp.reply, /Brisa/);
});

test('elara static analyzer catches unclosed HTML tags, invalid JSON, and unsafe innerHTML', () => {
  const htmlCheck = inspectCodeSnippet('html', '<html><body><div><p>Hola</body></html>');
  assert.equal(htmlCheck.detectedKind, 'html');
  assert.ok(htmlCheck.findings.some((f) => f.severity === 'error'));

  const jsonCheck = inspectCodeSnippet('json', '{"a": 1, }');
  assert.equal(jsonCheck.detectedKind, 'json');
  assert.ok(jsonCheck.findings.some((f) => f.severity === 'error'));

  const jsCheck = inspectCodeSnippet('js', 'el.innerHTML = userInput; fetch("/api")');
  assert.ok(jsCheck.findings.some((f) => /innerHTML/i.test(f.message)));
  assert.ok(jsCheck.findings.some((f) => /\.ok/.test(f.message)));
});

test('elara engine refuses to hallucinate on out-of-domain queries', () => {
  const res = runElaraCoreEngine([{ role: 'user', text: 'Explica el teorema espectral en espacios de Hilbert complejos' }]);
  assert.equal(res.intent, '__fallback_honest__');
  assert.match(res.reply, /Elara Core v0\.1/);
});
