import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {legacyMD5,levelId,levelText,parseLevelText,validateLevel} from '../level-format.js';
test('Flash MD5 uses low bytes, including Chinese and surrogate pairs',()=>{
  for(const value of ['', 'abc', '自定义🐤']){
    const bytes=Buffer.from(Array.from({length:value.length},(_,i)=>value.charCodeAt(i)&255));
    assert.equal(legacyMD5(value),createHash('md5').update(bytes).digest('hex'));
  }
});
test('all original schedules round trip through Flash text format',()=>{
  const levels=JSON.parse(readFileSync(new URL('../data/levels.json',import.meta.url)));
  assert.equal(levels.length,11);
  for(const l of levels){const parsed=validateLevel(parseLevelText(levelText(l)));assert.deepEqual(parsed.sequence,l.sequence);assert.equal(parsed.title,l.title);assert.equal(parsed.time,l.time);}
});
test('invalid schedules rejected',()=>{
  assert.throws(()=>parseLevelText('[title:x][time:3][chickspeed:12][sequence:(bad,2,3,4,5)]'));
  assert.throws(()=>validateLevel({title:'x',time:3,chickSpeed:12,sequence:[{type:'bomb',x:2,vy:0,dropFrame:1,reachFrame:2}]}));
});
test('optional author round trips through TXT and JSON without changing level identity',()=>{
  const original=JSON.parse(readFileSync(new URL('../data/levels.json',import.meta.url)))[0];
  const level=validateLevel({...original,author:'  小明 & Li D.R.  '});
  assert.equal(level.author,'小明 & Li D.R.');
  assert.equal(validateLevel(parseLevelText(levelText(level))).author,level.author);
  assert.equal(validateLevel(JSON.parse(JSON.stringify(level))).author,level.author);
  assert.equal(levelId(level),legacyMD5(levelText(original)));
  assert.equal(levelId({...level,author:'另一位作者'}),levelId(level));
  assert.equal(levelText({...level,author:''}),levelText(original));
  assert.equal(validateLevel(parseLevelText(levelText(original))).author,'');
});
test('authors cannot inject TXT fields or exceed the display limit',()=>{
  const level=JSON.parse(readFileSync(new URL('../data/levels.json',import.meta.url)))[0];
  for(const author of ['a:b','a[b','a]b','a\nb','a'.repeat(41),42])assert.throws(()=>validateLevel({...level,author}));
});
test('hit regions and animation durations come from XFL',()=>{
  const hits=JSON.parse(readFileSync(new URL('../data/hit-regions.json',import.meta.url)));
  assert.deepEqual(hits.collections.left_btn,[102.75,569.85,65,65]);
  assert.deepEqual(hits.collections.right_btn,[313.75,569.85,65,65]);
  const timeline=JSON.parse(readFileSync(new URL('../data/animations.json',import.meta.url)));
  assert.equal(timeline.chickHitFrames,5);assert.equal(timeline.explosionFrames,11);
  assert.equal(timeline.popup.Motion_Y.at(-1).value,-54.5);
});
