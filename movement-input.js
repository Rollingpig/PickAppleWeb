export function createMovementInput(){
  const keyboard=new Set(),pointers=new Map();
  const directionForKey=key=>({arrowleft:'left',a:'left',arrowright:'right',d:'right'})[key];
  const active=direction=>[...keyboard].some(key=>directionForKey(key)===direction)||[...pointers.values()].includes(direction);
  return {
    get left(){return active('left');},
    get right(){return active('right');},
    setKey(key,pressed){if(directionForKey(key)){if(pressed)keyboard.add(key);else keyboard.delete(key);}},
    reset(){keyboard.clear();pointers.clear();},
    bind(buttons){
      const update=event=>{
        let direction=null;
        for(const [candidate,node] of Object.entries(buttons)){
          const rect=node.getBoundingClientRect();
          if(event.clientX>=rect.left&&event.clientX<rect.right&&event.clientY>=rect.top&&event.clientY<rect.bottom){direction=candidate;break;}
        }
        pointers.set(event.pointerId,direction);
      };
      for(const node of Object.values(buttons)){
        node.addEventListener('pointerdown',event=>{
          if(event.button!==0)return;
          event.preventDefault();node.setPointerCapture(event.pointerId);update(event);
        });
        node.addEventListener('pointermove',event=>{if(pointers.has(event.pointerId))update(event);});
        for(const name of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(name,event=>pointers.delete(event.pointerId));
      }
    }
  };
}
