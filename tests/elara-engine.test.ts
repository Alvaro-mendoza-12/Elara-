import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCodeSnippet } from '../lib/elara-engine/code-analyzer';
import { runElaraCoreEngine } from '../lib/elara-engine/engine';
import { tokenizeHighlightedLines } from '../lib/syntax-highlight';

test('elara safety safeguard responds empathetically with crisis lines on self-harm messages', () => {
  const res = runElaraCoreEngine([{ role: 'user', text: 'me quiero matar' }]);
  assert.equal(res.intent, 'safety_crisis_support');
  assert.match(res.reply, /113/);
  assert.match(res.reply, /106/);
  assert.doesNotMatch(res.reply, /Elara Core/);
});

test('elara builds a real 20 dog toys store web page matching the exact prompt topic and count', () => {
  const res = runElaraCoreEngine([{ role: 'user', text: 'Generame una web de 20 juguetes de perritos' }]);
  assert.equal(res.intent, 'code_index_dynamic_catalog');
  assert.match(res.reply, /```html\n<!DOCTYPE html>/);
  assert.match(res.reply, /Juguetes para Perritos/i);
  assert.match(res.reply, /Hueso Dental Menta/);
  assert.match(res.reply, /Cojín Ardilla Con Escondite/);

  const jsonMatch = res.reply.match(/const ITEMS = (\[[\s\S]*?\]);/);
  assert.ok(jsonMatch?.[1]);
  const parsed = JSON.parse(jsonMatch[1]) as unknown[];
  assert.equal(parsed.length, 20);
});

test('elara responds accurately to arithmetic, HTTP codes, and Novvin identity', () => {
  const mathRes = runElaraCoreEngine([{ role: 'user', text: 'Cuánto es 25 * 14?' }]);
  assert.match(mathRes.reply, /350/);

  const pctRes = runElaraCoreEngine([{ role: 'user', text: 'Cuánto es 15% de 800' }]);
  assert.match(pctRes.reply, /120/);

  const httpRes = runElaraCoreEngine([{ role: 'user', text: 'Qué significa el error 400?' }]);
  assert.match(httpRes.reply, /HTTP 400/);

  const novvinRes = runElaraCoreEngine([{ role: 'user', text: 'Como se conecta con Novvin?' }]);
  assert.match(novvinRes.reply, /Continuar con Novvin/);
});

test('elara handles follow-up edits on generated catalog without losing topic', () => {
  const first = runElaraCoreEngine([{ role: 'user', text: 'Generame una web de 12 juguetes de perritos' }]);
  const followUp = runElaraCoreEngine([
    { role: 'user', text: 'Generame una web de 12 juguetes de perritos' },
    { role: 'assistant', text: first.reply },
    { role: 'user', text: 'Cambia a tema claro para "Firulais Shop"' },
  ]);
  assert.match(followUp.reply, /#f8fafc/);
  assert.match(followUp.reply, /Firulais Shop/);
});

test('elara static analyzer and syntax highlighter handle HTML, JSON, and JS properly', () => {
  const htmlCheck = inspectCodeSnippet('html', '<html><body><div><p>Hola</body></html>');
  assert.equal(htmlCheck.detectedKind, 'html');
  assert.ok(htmlCheck.findings.some((f) => f.severity === 'error'));

  const jsonCheck = inspectCodeSnippet('json', '{"a": 1, }');
  assert.equal(jsonCheck.detectedKind, 'json');
  assert.ok(jsonCheck.findings.some((f) => f.severity === 'error'));

  const tokens = tokenizeHighlightedLines('<h1 class="hero">Hola</h1>', 'html');
  assert.ok(tokens[0].some((t) => t.kind === 'tag'));
  assert.ok(tokens[0].some((t) => t.kind === 'attr'));
  assert.ok(tokens[0].some((t) => t.kind === 'string'));
});
