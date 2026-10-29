import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

const filename = path.resolve('src/entities/teacher-lesson/model/helpers.ts');
const helpers = new Module(filename);
helpers.filename = filename;
helpers.paths = Module._nodeModulePaths(path.dirname(filename));
helpers._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { formatLessonTime, getLessonEmbedUrl, getLessonWatchUrl, parseLessonProgress } = helpers.exports;
const lessons = JSON.parse(fs.readFileSync('src/entities/teacher-lesson/model/lessons.json', 'utf8'));

test('each lesson has ordered, in-range moments and complete Russian/Kyrgyz notes', () => {
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, lessons.length);
  for (const lesson of lessons) {
    assert.match(lesson.youtubeId, /^[a-zA-Z0-9_-]{11}$/);
    assert.equal(new Set(lesson.moments.map((moment) => moment.id)).size, lesson.moments.length);
    let previous = -1;
    for (const moment of lesson.moments) {
      assert.ok(Number.isInteger(moment.seconds) && moment.seconds > previous && moment.seconds < lesson.durationSeconds);
      previous = moment.seconds;
      for (const locale of ['ru', 'ky']) {
        assert.ok(lesson.title[locale].trim() && moment.title[locale].trim() && moment.question[locale].trim());
        assert.ok(moment.points[locale].length > 0 && moment.points[locale].every((point) => point.trim()));
      }
    }
  }
  assert.equal(lessons[0].youtubeId, 'CI4dYS7Myls');
  assert.equal(lessons[0].moments.length, 14);
});

test('embed and external links use the same source and only start autoplay after a chosen moment', () => {
  const id = lessons[0].youtubeId;
  const initial = new URL(getLessonEmbedUrl(id));
  assert.equal(initial.hostname, 'www.youtube-nocookie.com');
  assert.equal(initial.searchParams.get('autoplay'), null);
  const selected = new URL(getLessonEmbedUrl(id, 390.8, true));
  assert.equal(selected.searchParams.get('start'), '390');
  assert.equal(selected.searchParams.get('autoplay'), '1');
  const external = new URL(getLessonWatchUrl(id, 390));
  assert.equal(external.hostname, 'www.youtube.com');
  assert.equal(external.searchParams.get('v'), id);
  assert.equal(external.searchParams.get('t'), '390');
  assert.throws(() => getLessonEmbedUrl('../untrusted-host'));
});

test('corrupt progress does not confirm a view or replace valid bookmarks', () => {
  assert.deepEqual(parseLessonProgress(null), { watched: {}, bookmarks: {} });
  assert.deepEqual(parseLessonProgress({ watched: { first: 'true', second: true }, bookmarks: { first: 12, second: 'moment-one' } }), {
    watched: { second: true }, bookmarks: { second: 'moment-one' },
  });
  assert.equal(formatLessonTime(3543), '59:03');
  assert.equal(formatLessonTime(3600), '1:00:00');
});
