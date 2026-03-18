const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanString } = require('./string-cleaner.js');

test('preserves existing newline removal behavior', function () {
  const result = cleanString('hello\r\nworld', { newlines: true });
  assert.equal(result.text, 'helloworld');
  assert.equal(result.urlDecodeError, false);
});

test('removes all whitespace when requested', function () {
  const result = cleanString(' a\tb \n c\r\n', {
    removeAllWhitespace: true
  });

  assert.equal(result.text, 'abc');
});

test('collapsing spaces still works when removing all whitespace is disabled', function () {
  const result = cleanString('a   b    c', {
    collapseSpaces: true
  });

  assert.equal(result.text, 'a b c');
});

test('removes boxed terminal borders with line and character trimming options', function () {
  const input = [
    '=======================',
    '| real content is inside of here |',
    '| and there is more here.          |',
    '======================='
  ].join('\n');

  const result = cleanString(input, {
    removeFirstLines: 1,
    removeLastLines: 1,
    removeFirstChars: 2,
    removeLastChars: 2
  });

  assert.equal(result.text, [
    'real content is inside of here',
    'and there is more here.         '
  ].join('\n'));
});

test('over-large line and character trimming safely produces empty content', function () {
  const result = cleanString('abc\ndef', {
    removeFirstLines: 3,
    removeFirstChars: 10,
    removeLastChars: 10
  });

  assert.equal(result.text, '');
});

test('reports URL decode errors without changing the text', function () {
  const result = cleanString('%E0%A4%A', {
    urlDecode: true
  });

  assert.equal(result.text, '%E0%A4%A');
  assert.equal(result.urlDecodeError, true);
});

test('removes html tags and script block contents', function () {
  const result = cleanString('<p>Hello</p><script>alert(1)</script><style>body{}</style>World', {
    stripHtml: true
  });

  assert.equal(result.text, 'HelloWorld');
});
