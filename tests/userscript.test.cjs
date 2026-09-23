const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

// Run the complete, unmodified userscript. Observe behavior through its public
// hooks, DOM and click-to-print diagnostics, without exporting test-only globals.
const source = fs.readFileSync(process.env.AGEBYPASSX_TEST_SOURCE || path.join(__dirname, '..', 'AgebypassX.user.js'), 'utf8');
const FLAG = 'age_verification_gate_enabled';
const expectedFlags = {
  rweb_age_assurance_flow_enabled: false,
  age_verification_gate_enabled: false,
  sensitive_tweet_warnings_enabled: false,
  sensitive_media_settings_enabled: true,
  grok_settings_age_restriction_enabled: false,
  rweb_mvr_blurred_media_interstitial_enabled: false
};

function browser(t, before) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main></main></body></html>', {
    url: 'https://x.com/home', runScripts: 'outside-only', virtualConsole: new VirtualConsole()
  });
  const { window } = dom;
  const logs = [];
  for (const method of ['log', 'warn', 'info', 'group', 'groupEnd']) {
    window.console[method] = (...args) => logs.push(args);
  }
  // jsdom has no fetch implementation. Give each window its own subclass of
  // Node's real Response, keeping native JSON parsing and body-consumption rules.
  window.Response = class BrowserResponse extends Response {
    json() { return super.json(); }
  };
  if (before) before(window);
  window.eval(source);
  t.after(() => window.close());
  return { window, document: window.document, logs };
}

const settle = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
function diagnostics(env) {
  env.document.getElementById('nox-indicator').click();
  function last(label) { return env.logs.findLast(row => row[0] === label); }
  return {
    status: last('status:')[1], errors: last('status:')[3],
    gates: plain(last('gate hits:')[1]), found: plain(last('flags found:')[1]),
    changed: plain(last('flags changed:')[1]), failed: plain(last('flag process/write failures:')[1]),
    birthdate: plain(last('birthdate:')[1])
  };
}

test('patches every known flag in direct, wrapped and GraphQL forms without changing value types', t => {
  const env = browser(t);
  const state = [];
  for (const [key, desired] of Object.entries(expectedFlags)) {
    for (const convert of [Boolean, String, Number]) {
      state.push({ [key]: convert(!desired) }, { [key]: { value: convert(!desired) } }, { feature: key, enabled: convert(!desired) });
    }
  }
  env.window.__INITIAL_STATE__ = state;
  let i = 0;
  for (const [key, desired] of Object.entries(expectedFlags)) {
    for (const convert of [Boolean, String, Number]) {
      assert.equal(state[i++][key], convert(desired));
      assert.equal(state[i++][key].value, convert(desired));
      assert.equal(state[i++].enabled, convert(desired));
    }
  }
  assert.equal(diagnostics(env).changed[FLAG], 9);
});

test('preserves and patches state that existed before injection', t => {
  const state = { [FLAG]: true };
  const env = browser(t, w => { w.__INITIAL_STATE__ = state; });
  assert.equal(env.window.__INITIAL_STATE__, state);
  assert.equal(state[FLAG], false);
  assert.equal(diagnostics(env).gates.state, 1);
});

test('leaves a throwing existing state accessor intact and keeps other hooks available', t => {
  const getter = () => { throw new Error('capture failed'); };
  const env = browser(t, w => Object.defineProperty(w, '__INITIAL_STATE__', { configurable: true, get: getter }));
  assert.equal(Object.getOwnPropertyDescriptor(env.window, '__INITIAL_STATE__').get, getter);
  assert.equal(diagnostics(env).status, 'ERROR');
  assert.equal(env.window.JSON.parse(`{"${FLAG}":true}`)[FLAG], false);
});

test('handles 20,000 nested objects without truncation or stack overflow', t => {
  const env = browser(t);
  const root = {}; let leaf = root;
  for (let i = 0; i < 20000; i++) leaf = leaf.next = {};
  leaf[FLAG] = true;
  env.window.__INITIAL_STATE__ = root;
  assert.equal(leaf[FLAG], false);
  assert.equal(diagnostics(env).errors, 0);
});

test('handles cycles and shared nodes once per patch, then patches them again on a later update', t => {
  const env = browser(t);
  const shared = { [FLAG]: true };
  const root = { first: shared, second: shared }; root.self = root; shared.loop = root;
  env.window.__INITIAL_STATE__ = root;
  assert.equal(shared[FLAG], false);
  assert.equal(diagnostics(env).found[FLAG], 1);
  shared[FLAG] = true;
  env.window.__INITIAL_STATE__ = root;
  assert.equal(shared[FLAG], false);
  assert.equal(diagnostics(env).found[FLAG], 2);
});

test('preserves numeric and string birthdates and fills missing fields', t => {
  const env = browser(t);
  const state = [{ birthdate: { year: '2008', month: '9', day: '21' } }, { birthdate: { year: 2008 } }];
  env.window.__INITIAL_STATE__ = state;
  assert.deepEqual(state[0].birthdate, { year: '1990', month: '1', day: '1' });
  assert.deepEqual(state[1].birthdate, { year: 1990, month: 1, day: 1 });
  assert.deepEqual(diagnostics(env).birthdate, { seen: 2, changed: 6, failed: 0 });
});

test('records frozen properties, throwing getters and discarded writes without breaking sibling patches', t => {
  const env = browser(t);
  const frozen = Object.freeze({ [FLAG]: true });
  const throwing = Object.defineProperty({}, FLAG, { enumerable: true, get() { throw Error('blocked'); } });
  const discarded = Object.defineProperty({}, FLAG, { enumerable: true, get() { return true; }, set() {} });
  const healthy = { [FLAG]: true };
  env.window.__INITIAL_STATE__ = { frozen, throwing, discarded, healthy };
  assert.equal(healthy[FLAG], false);
  const stats = diagnostics(env);
  assert.equal(stats.failed[FLAG], 3);
  assert.equal(stats.changed[FLAG], 1);
  assert.equal(stats.status, 'ACTIVE');
});

test('skips DOM nodes, browser globals and throwing unrelated getters', t => {
  const env = browser(t);
  const element = env.document.createElement('section'); element[FLAG] = true;
  env.window[FLAG] = true;
  const good = { [FLAG]: true };
  const root = { element, global: env.window, doc: env.document, good,
    get unrelated() { throw Error('not readable'); } };
  env.window.__INITIAL_STATE__ = root;
  assert.equal(element[FLAG], true);
  assert.equal(env.window[FLAG], true);
  assert.equal(good[FLAG], false);
  assert.equal(diagnostics(env).errors, 0);
});

test('reports traversal failures, continues siblings and recovers only after a relevant successful patch', t => {
  const env = browser(t);
  const broken = new Proxy({}, { ownKeys() { throw Error('no keys'); } });
  const healthy = { [FLAG]: true };
  env.window.__INITIAL_STATE__ = { broken, healthy };
  assert.equal(healthy[FLAG], false);
  assert.equal(diagnostics(env).status, 'ERROR');
  env.window.JSON.parse('{"unrelated":1}');
  env.window.Object.assign({}, { unrelated: true });
  env.window.__INITIAL_STATE__ = undefined;
  assert.equal(diagnostics(env).status, 'ERROR');
  env.window.JSON.parse(`{"${FLAG}":true}`);
  assert.equal(diagnostics(env).status, 'ACTIVE');
  assert.equal(diagnostics(env).errors, 1);
});

test('a revoked proxy does not prevent a later sibling from being patched', t => {
  const env = browser(t);
  const { proxy, revoke } = Proxy.revocable({}, {}); revoke();
  const healthy = { [FLAG]: true };
  env.window.__INITIAL_STATE__ = { proxy, healthy };
  assert.equal(healthy[FLAG], false);
  assert.equal(diagnostics(env).status, 'ERROR');
});

test('Object.assign preserves class, array, custom-prototype, null-prototype and cross-realm targets', t => {
  const env = browser(t);
  const targets = env.window.eval('[new (class State {})(), [], Object.create({ marker: 1 }), Object.create(null), {}]');
  targets.push({}); // A plain object from another realm must work too.
  for (const target of targets) {
    const symbol = Symbol('native property');
    const source = { featureSwitch: { [FLAG]: true }, [symbol]: 42 };
    const result = env.window.Object.assign(target, { earlier: 1 }, source, { later: 2 });
    assert.equal(result, target);
    assert.equal(result.featureSwitch[FLAG], false);
    assert.equal(result[symbol], 42);
    assert.equal(result.earlier, 1);
    assert.equal(result.later, 2);
  }
  assert.equal(diagnostics(env).gates.assign, targets.length);
});

test('Object.assign retains native errors and avoids traversing unrelated objects', t => {
  const env = browser(t);
  assert.throws(() => env.window.Object.assign(null, {}), { name: 'TypeError' });
  assert.throws(() => env.window.Object.assign(Object.freeze({ x: 0 }), { x: 1 }), { name: 'TypeError' });
  const object = { nested: { [FLAG]: true } };
  assert.equal(env.window.Object.assign(object, { x: 1 }), object);
  assert.equal(object.nested[FLAG], true);
  assert.equal(diagnostics(env).gates.assign, 0);
});

test('JSON.parse retains reviver behavior and native syntax errors', t => {
  const env = browser(t);
  let receiver;
  const parsed = env.window.JSON.parse(`{"${FLAG}":true,"n":2}`, function(key, value) {
    if (key === 'n') { receiver = this; return value * 3; }
    return value;
  });
  assert.equal(parsed[FLAG], false);
  assert.equal(parsed.n, 6);
  assert.equal(receiver, parsed);
  assert.throws(() => env.window.JSON.parse('{'), { name: 'SyntaxError' });
  assert.equal(env.window.JSON.parse('42'), 42);
  assert.equal(diagnostics(env).gates.parse, 1);
});

test('JSON.parse patches flags beyond the proposed PR depth cutoff', t => {
  const env = browser(t);
  const parsed = env.window.JSON.parse('{"next":'.repeat(100) + `{"${FLAG}":true}` + '}'.repeat(100));
  let leaf = parsed; for (let i = 0; i < 100; i++) leaf = leaf.next;
  assert.equal(leaf[FLAG], false);
  assert.equal(diagnostics(env).errors, 0);
});

test('Response.json patches native parsed data without relying on the page JSON.parse hook', async t => {
  const env = browser(t);
  const response = new env.window.Response(`{"data":{"${FLAG}":true}}`);
  const parsed = await response.json();
  assert.equal(parsed.data[FLAG], false);
  assert.equal(response.bodyUsed, true);
  assert.equal(diagnostics(env).gates.json, 1);
  assert.equal(diagnostics(env).gates.parse, 0);
  await assert.rejects(response.json(), { name: 'TypeError' });
});

test('Response.json preserves parsing failures, invalid receivers and unrelated payloads', async t => {
  const env = browser(t);
  await assert.rejects(new env.window.Response('{').json(), { name: 'SyntaxError' });
  await assert.rejects(env.window.Response.prototype.json.call({}), { name: 'TypeError' });
  assert.deepEqual(await new env.window.Response('{"n":1}').json(), { n: 1 });
  assert.equal(diagnostics(env).gates.json, 0);
});

test('Response.json recognizes feature-array flag values, including at the root', async t => {
  const env = browser(t);
  for (const data of [{ feature: FLAG, enabled: true }, { data: [{ feature: FLAG, enabled: 'true' }] }]) {
    const parsed = await new env.window.Response(JSON.stringify(data)).json();
    const entry = parsed.data ? parsed.data[0] : parsed;
    assert.equal(entry.enabled, typeof data.enabled === 'boolean' ? false : 'false');
  }
  assert.equal(diagnostics(env).gates.json, 2);
});

test('prototype property names never count as feature flags or get overwritten', async t => {
  const env = browser(t);
  const entries = ['constructor', 'toString', '__proto__', 'hasOwnProperty'].map(feature => ({ feature, enabled: true }));
  env.window.__INITIAL_STATE__ = entries;
  for (const entry of entries) assert.equal(entry.enabled, true);
  await new env.window.Response('{"constructor":{},"toString":1}').json();
  assert.equal(diagnostics(env).gates.json, 0);
  assert.deepEqual(Object.keys(diagnostics(env).found).sort(), Object.keys(expectedFlags).sort());
});

test('response pre-scan revisits a shared object when reached by a shorter route', async t => {
  const env = browser(t, w => {
    w.Response = class { constructor(data) { this.data = data; } json() { return Promise.resolve(this.data); } };
  });
  const shared = { nested: { [FLAG]: true } };
  const root = { long: { a: { b: { c: { shared } } } }, short: shared };
  root.self = root;
  await new env.window.Response(root).json();
  assert.equal(shared.nested[FLAG], false);
  assert.equal(diagnostics(env).gates.json, 1);
});

test('response pre-scan retains its documented depth-five boundary', async t => {
  const env = browser(t);
  for (const depth of [5, 6]) {
    const root = {}; let leaf = root;
    for (let i = 0; i < depth; i++) leaf = leaf.next = {};
    leaf[FLAG] = true;
    let parsed = await new env.window.Response(JSON.stringify(root)).json();
    for (let i = 0; i < depth; i++) parsed = parsed.next;
    assert.equal(parsed[FLAG], depth === 6);
  }
  assert.equal(diagnostics(env).gates.json, 1);
});

test('hooks retain native function names and arities without patching Function.prototype', t => {
  let originalToString, lengths;
  const env = browser(t, w => {
    originalToString = w.Function.prototype.toString;
    lengths = [w.Object.assign.length, w.JSON.parse.length, w.Response.prototype.json.length];
  });
  const functions = [env.window.Object.assign, env.window.JSON.parse, env.window.Response.prototype.json];
  assert.deepEqual(functions.map(fn => fn.name), ['assign', 'parse', 'json']);
  assert.deepEqual(functions.map(fn => fn.length), lengths);
  assert.equal(env.window.Function.prototype.toString, originalToString);
  assert.equal(functions.some(fn => Object.hasOwn(fn, 'toString')), false);
});

test('hooks install before the body exists and the indicator waits for a body', async t => {
  const env = browser(t, w => { w.document.body.remove(); });
  assert.equal(env.document.getElementById('nox-indicator'), null);
  assert.equal(env.window.JSON.parse(`{"${FLAG}":true}`)[FLAG], false);
  env.document.head.appendChild(env.document.createElement('meta'));
  await settle();
  assert.equal(env.document.getElementById('nox-indicator'), null);
  const body = env.document.createElement('body'); env.document.documentElement.appendChild(body);
  await settle();
  assert.equal(env.document.getElementById('nox-indicator').parentNode, body);
  assert.equal(env.document.getElementById('nox-indicator-style').parentNode, env.document.head);
});

test('document-start works even when html has not been created yet', async t => {
  const env = browser(t, w => { w.document.documentElement.remove(); });
  assert.equal(env.document.getElementById('nox-indicator'), null);
  const html = env.document.createElement('html'); env.document.appendChild(html);
  html.appendChild(env.document.createElement('head'));
  await settle();
  assert.equal(env.document.getElementById('nox-indicator'), null);
  html.appendChild(env.document.createElement('body'));
  await settle();
  assert.equal(env.document.getElementById('nox-indicator').parentNode, env.document.body);
});

test('restores independently removed indicator and stylesheet without creating duplicates', async t => {
  const env = browser(t);
  env.document.getElementById('nox-indicator').remove();
  await settle();
  assert.equal(env.document.querySelectorAll('#nox-indicator').length, 1);
  env.document.getElementById('nox-indicator-style').remove();
  await settle();
  assert.equal(env.document.querySelectorAll('#nox-indicator-style').length, 1);
  assert.equal(env.document.getElementById('nox-indicator-style').textContent.includes('position:fixed'), true);
  env.document.dispatchEvent(new env.window.Event('DOMContentLoaded'));
  await settle();
  assert.equal(env.document.querySelectorAll('#nox-indicator').length, 1);
  assert.equal(env.document.querySelectorAll('#nox-indicator-style').length, 1);
});

test('recovers from body, head and whole-root replacement', async t => {
  const env = browser(t);
  for (const tag of ['body', 'head']) {
    const fresh = env.document.createElement(tag);
    env.document[tag].replaceWith(fresh);
    await settle();
    assert.equal(env.document.getElementById('nox-indicator').parentNode, env.document.body);
    assert.equal(env.document.getElementById('nox-indicator-style').parentNode, env.document.head);
  }
  const root = env.document.createElement('html'); root.innerHTML = '<head></head><body></body>';
  env.document.documentElement.replaceWith(root);
  await settle();
  assert.equal(env.document.getElementById('nox-indicator').parentNode, env.document.body);
  assert.equal(env.document.getElementById('nox-indicator-style').parentNode, env.document.head);
});

test('moves styles out of the fallback body when a head becomes available', async t => {
  const env = browser(t, w => { w.document.head.remove(); });
  assert.equal(env.document.getElementById('nox-indicator-style').parentNode, env.document.body);
  const head = env.document.createElement('head'); env.document.documentElement.prepend(head);
  await settle();
  assert.equal(env.document.getElementById('nox-indicator-style').parentNode, head);
});

test('visibility preference and health survive remounting; only the exact hotkey toggles', async t => {
  const env = browser(t, w => w.localStorage.setItem('nox-indicator-hidden', '1'));
  const hotkey = options => env.document.dispatchEvent(new env.window.KeyboardEvent('keydown', {
    code: 'Period', altKey: true, bubbles: true, cancelable: true, ...options
  }));
  assert.equal(env.document.getElementById('nox-indicator').dataset.hidden, 'true');
  hotkey({ ctrlKey: true });
  assert.equal(env.document.getElementById('nox-indicator').dataset.hidden, 'true');
  assert.equal(hotkey({}), false);
  assert.equal(env.window.localStorage.getItem('nox-indicator-hidden'), '0');
  env.window.__INITIAL_STATE__ = new Proxy({}, { ownKeys() { throw Error('broken'); } });
  env.document.getElementById('nox-indicator').remove();
  await settle();
  const dot = env.document.getElementById('nox-indicator');
  assert.equal(dot.dataset.hidden, 'false');
  assert.equal(dot.dataset.state, 'err');
  assert.equal(diagnostics(env).status, 'ERROR');
});

test('blocked localStorage does not prevent hooks or the hotkey from working', t => {
  const env = browser(t, w => Object.defineProperty(w, 'localStorage', { get() { throw Error('denied'); } }));
  env.document.dispatchEvent(new env.window.KeyboardEvent('keydown', { code: 'Period', altKey: true }));
  assert.equal(env.document.getElementById('nox-indicator').dataset.hidden, 'true');
  assert.equal(env.window.JSON.parse(`{"${FLAG}":true}`)[FLAG], false);
});

test('busy timeline changes do not cause observer churn or duplicate indicators', async t => {
  let callbacks = 0;
  const env = browser(t, w => {
    const NativeObserver = w.MutationObserver;
    w.MutationObserver = class extends NativeObserver {
      constructor(callback) { super((...args) => { callbacks++; callback(...args); }); }
    };
  });
  await settle();
  const before = callbacks;
  const main = env.document.querySelector('main');
  for (let i = 0; i < 1000; i++) main.appendChild(env.document.createElement('article'));
  await settle();
  assert.equal(callbacks, before);
  assert.equal(env.document.querySelectorAll('#nox-indicator').length, 1);
});
