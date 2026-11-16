import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCodeSnippet } from '../lib/elara-engine/code-analyzer';
import { runElaraCoreEngine } from '../lib/elara-engine/engine';
import { tokenizeHighlightedLines } from '../lib/syntax-highlight';

test('elara safety safeguard responds empathetically with crisis lines on self-harm messages', () => {
  const res = runElaraCoreEngine([{ role: 'user', text: 'me quiero matar' }]);
  assert.equal(res.intent, 'safety_crisis_support');
  assert.match(res.reply, /113/);
  assert.match(res.reply, /¿Estás a salvo/);
  assert.match(res.reply, /https:\/\/www.gob.pe\/555/);
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

test('elara generates domain catalogs with custom accent color, count and PEN currency', () => {
  const res = runElaraCoreEngine([
    { role: 'user', text: 'Crea una web de 10 laptops gamer en color morado en soles' },
  ]);
  assert.equal(res.intent, 'code_index_dynamic_catalog');
  assert.match(res.reply, /#a855f7/);
  assert.match(res.reply, /S\/\s*\d/);
  const jsonMatch = res.reply.match(/const ITEMS = (\[[\s\S]*?\]);/);
  assert.ok(jsonMatch?.[1]);
  const parsed = JSON.parse(jsonMatch[1]) as unknown[];
  assert.equal(parsed.length, 10);
});

test('elara generates Todo, Pomodoro, Quiz and Palette apps and supports color follow-up', () => {
  const todo = runElaraCoreEngine([{ role: 'user', text: 'Haz un gestor de tareas interactivo en index.html' }]);
  assert.equal(todo.intent, 'code_index_todo');
  assert.match(todo.reply, /data-elara-app="todo"/);

  const todoFollowUp = runElaraCoreEngine([
    { role: 'user', text: 'Haz un gestor de tareas interactivo en index.html' },
    { role: 'assistant', text: todo.reply },
    { role: 'user', text: 'Cambia el color a verde en tema claro' },
  ]);
  assert.match(todoFollowUp.reply, /data-elara-app="todo"/);
  assert.match(todoFollowUp.reply, /#10b981/);
  assert.match(todoFollowUp.reply, /#f8fafc/);

  const pomodoro = runElaraCoreEngine([{ role: 'user', text: 'Crea un temporizador pomodoro' }]);
  assert.equal(pomodoro.intent, 'code_index_pomodoro');
  assert.match(pomodoro.reply, /25:00/);

  const quiz = runElaraCoreEngine([{ role: 'user', text: 'Genera un quiz interactivo' }]);
  assert.equal(quiz.intent, 'code_index_quiz');
  assert.match(quiz.reply, /QUESTIONS/);

  const palette = runElaraCoreEngine([{ role: 'user', text: 'Crea un generador de paletas de colores' }]);
  assert.equal(palette.intent, 'code_index_palette');
  assert.match(palette.reply, /linear-gradient/);
});

test('elara resolves unit conversion, color conversion, uuid, password and CSS guide tables', () => {
  const unitRes = runElaraCoreEngine([{ role: 'user', text: 'Convierte 10 km a millas' }]);
  assert.equal(unitRes.intent, 'unit_convert');
  assert.match(unitRes.reply, /6\.2137/);

  const colorRes = runElaraCoreEngine([{ role: 'user', text: 'Convierte color #38bdf8 a rgb' }]);
  assert.equal(colorRes.intent, 'dev_color_convert');
  assert.match(colorRes.reply, /rgb\(56, 189, 248\)/);

  const uuidRes = runElaraCoreEngine([{ role: 'user', text: 'Genera un uuid' }]);
  assert.equal(uuidRes.intent, 'dev_uuid_gen');
  assert.match(uuidRes.reply, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

  const cssRes = runElaraCoreEngine([{ role: 'user', text: 'Diferencia entre flexbox y css grid' }]);
  assert.match(cssRes.reply, /\| Necesidad \| Recomendado \|/);
});

test('elara generates blog and booking form apps and runs json/base64/timestamp utilities', () => {
  const blog = runElaraCoreEngine([{ role: 'user', text: 'Genera un blog revista digital en tema claro' }]);
  assert.equal(blog.intent, 'code_index_blog');
  assert.match(blog.reply, /data-elara-app="blog"/);

  const form = runElaraCoreEngine([{ role: 'user', text: 'Crea un formulario de reserva y contacto en index.html' }]);
  assert.equal(form.intent, 'code_index_form');
  assert.match(form.reply, /data-elara-app="form"/);

  const catalogSort = runElaraCoreEngine([{ role: 'user', text: 'Generame una web de 6 laptops gamer' }]);
  assert.match(catalogSort.reply, /sortSelect/);
  assert.match(catalogSort.reply, /checkoutBtn/);

  const jsonRes = runElaraCoreEngine([{ role: 'user', text: 'Formatea json {"app":"ELARA","v":4,"ok":true}' }]);
  assert.equal(jsonRes.intent, 'dev_json_format');
  assert.match(jsonRes.reply, /"v": 4/);

  const b64Encode = runElaraCoreEngine([{ role: 'user', text: 'Codifica en base64 "Hola ELARA"' }]);
  assert.equal(b64Encode.intent, 'dev_base64');
  assert.match(b64Encode.reply, /SG9sYSBFTEFSQQ==/);

  const b64Decode = runElaraCoreEngine([{ role: 'user', text: 'Decodifica base64 "SG9sYSBFTEFSQQ=="' }]);
  assert.equal(b64Decode.intent, 'dev_base64');
  assert.match(b64Decode.reply, /Hola ELARA/);

  const tsRes = runElaraCoreEngine([{ role: 'user', text: 'Convierte timestamp 1700000000' }]);
  assert.equal(tsRes.intent, 'dev_timestamp');
  assert.match(tsRes.reply, /2023-11-14/);
});
