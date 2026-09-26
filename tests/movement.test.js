import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMovementInput} from '../movement-input.js';

function setup(){
  const input=createMovementInput();
  function button(left){const node=new EventTarget();node.getBoundingClientRect=()=>({left,right:left+100,top:0,bottom:100});node.setPointerCapture=()=>{};return node;}
  const buttons={left:button(0),right:button(100)};input.bind(buttons);
  const send=(name,x=50,id=1,button=0)=>{const event=new Event(name,{cancelable:true});Object.assign(event,{clientX:x,clientY:50,pointerId:id,button});buttons.left.dispatchEvent(event);};
  return {input,send};
}
test('hover and right mouse button never start movement',()=>{
  const {input,send}=setup();send('pointermove');assert.equal(input.left,false);
  send('pointerdown',50,1,2);send('pointermove');assert.equal(input.left,false);
});
test('held pointer slides between directions and stops outside or on release',()=>{
  const {input,send}=setup();send('pointerdown');assert.equal(input.left,true);
  send('pointermove',150);assert.equal(input.left,false);assert.equal(input.right,true);
  send('pointermove',250);assert.equal(input.right,false);
  send('pointermove',50);assert.equal(input.left,true);
  send('pointerup');send('pointermove');assert.equal(input.left,false);
});
test('releasing one finger does not cancel another finger',()=>{
  const {input,send}=setup();send('pointerdown',50,1);send('pointerdown',50,2);
  send('pointerup',50,1);assert.equal(input.left,true);
  send('pointercancel',50,2);assert.equal(input.left,false);
});
test('keyboard keys and pointers remain independent',()=>{
  const {input,send}=setup();input.setKey('a',true);input.setKey('arrowleft',true);
  send('pointerdown');send('pointerup');assert.equal(input.left,true);
  input.setKey('a',false);assert.equal(input.left,true);
  input.setKey('arrowleft',false);assert.equal(input.left,false);
  send('pointerdown');input.setKey('a',true);input.setKey('a',false);assert.equal(input.left,true);
});
test('lost capture and screen reset clear held pointers',()=>{
  const {input,send}=setup();send('pointerdown');send('lostpointercapture');assert.equal(input.left,false);
  send('pointerdown');input.setKey('d',true);input.reset();
  assert.equal(input.left,false);assert.equal(input.right,false);
  send('pointermove');assert.equal(input.left,false);
});
