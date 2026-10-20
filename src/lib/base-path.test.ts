import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withBase, withoutBase } from './base-path';

test('Pages URLs preserve the deployment path exactly once', () => {
  for (const route of ['/', '/post/a', '/img/cover.svg', '/pagefind/']) {
    assert.equal(withBase(route), `/myblog${route}`);
    assert.equal(withBase(withBase(route)), withBase(route));
    assert.equal(withoutBase(withBase(route)), route);
  }
});

test('URL boundaries, query strings and external links are preserved', () => {
  assert.equal(withoutBase('/myblogger/post'), '/myblogger/post');
  assert.equal(withoutBase('/myblog'), '/');
  assert.equal(withBase('/myblog/post/a?q=1#two'), '/myblog/post/a?q=1#two');
  for (const url of ['https://example.com/a', '//example.com/a', 'mailto:a@b.com', '#toc', '?q=a', 'data:image/png;base64,a']) {
    assert.equal(withBase(url), url);
  }
});
