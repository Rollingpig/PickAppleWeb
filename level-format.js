// MD5.as hashes the low byte of each UTF-16 code unit, rather than UTF-8.
export function legacyMD5(text) {
  const bytes=Array.from({length:text.length},(_,i)=>text.charCodeAt(i)&255);
  const bitLength=bytes.length*8;bytes.push(128);while(bytes.length%64!==56)bytes.push(0);
  for(let i=0;i<8;i++)bytes.push(i<4?(bitLength>>>i*8)&255:0);
  const shifts=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  const constants=Array.from({length:64},(_,i)=>(Math.floor(Math.abs(Math.sin(i+1))*2**32)|0));
  let hash=[0x67452301,0xefcdab89|0,0x98badcfe|0,0x10325476];
  for(let offset=0;offset<bytes.length;offset+=64){
    const words=Array.from({length:16},(_,i)=>bytes[offset+i*4]|bytes[offset+i*4+1]<<8|bytes[offset+i*4+2]<<16|bytes[offset+i*4+3]<<24);
    let [a,b,c,d]=hash;
    for(let i=0;i<64;i++){
      const round=Math.floor(i/16),f=round===0?(b&c)|(~b&d):round===1?(d&b)|(~d&c):round===2?b^c^d:c^(b|~d);
      const index=round===0?i:round===1?(5*i+1)%16:round===2?(3*i+5)%16:(7*i)%16;
      const value=(a+f+constants[i]+words[index])|0,shift=shifts[round*4+i%4];
      [a,b,c,d]=[d,(b+((value<<shift)|(value>>>(32-shift))))|0,b,c];
    }
    hash=hash.map((n,i)=>(n+[a,b,c,d][i])|0);
  }
  return hash.map(word=>Array.from({length:4},(_,i)=>((word>>>i*8)&255).toString(16).padStart(2,'0')).join('')).join('');
}
export function levelText(level){
  const title=String(level.title).replace(/[\[\]]/g,'');
  const background=level.background.startsWith('native/')||/^https?:/.test(level.background)?level.background:`native/${level.background}`;
  return '############This is level data.Once modified, MD5 test will fail.############\r'+
    `[title:${title}][time:${level.time}][chickspeed:${level.chickSpeed}][background:${background}][sequence:`+
    level.sequence.map(e=>`(${e.type},${e.x},${e.vy},${e.dropFrame},${e.reachFrame})`).join('')+']';
}
export function parseLevelText(raw){
  const fields=Object.fromEntries([...raw.matchAll(/\[(title|time|chickspeed|background):([^\]]*)\]/g)].map(m=>[m[1],m[2]]));
  const sequence=raw.match(/\[sequence:([^\]]*)\]/)?.[1];
  if(sequence===undefined||!fields.title||!fields.time||!fields.chickspeed)throw Error('缺少关卡字段');
  const entries=[...sequence.matchAll(/\((n|gold|bomb),(-?\d+),(\d+),(-?\d+),(-?\d+)\)/g)];
  if(entries.map(e=>e[0]).join('')!==sequence.trim())throw Error('运动序列格式错误');
  return {title:fields.title,time:Number(fields.time),chickSpeed:Number(fields.chickspeed),background:fields.background||'native/level1.png',sequence:entries.map(e=>({type:e[1],x:+e[2],vy:+e[3],dropFrame:+e[4],reachFrame:+e[5]}))};
}
export function validateLevel(source){
  if(!source||!Array.isArray(source.sequence)||source.sequence.length>10000)throw Error('关卡格式错误');
  const integer=(value,min,max)=>{const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw Error('关卡数值超出范围');return number;};
  const background=String(source.background||'level1.png').replace(/^native\//,'');
  if(!/^(level[123]?|trial|menu)\.png$/.test(background)&&!/^https?:\/\//.test(background))throw Error('不支持的背景路径');
  return {title:String(source.title||'导入关卡').slice(0,60),name:String(source.name||source.title||'导入关卡').slice(0,60),
    time:integer(source.time,2,10000),chickSpeed:integer(source.chickSpeed,1,100),background,
    sequence:source.sequence.map(e=>{if(!['n','gold','bomb'].includes(e.type))throw Error('物品类型错误');return {type:e.type,x:integer(e.x,-1000,1000),vy:integer(e.vy,1,200),dropFrame:integer(e.dropFrame,-10000,240000),reachFrame:integer(e.reachFrame,-10000,240000)};}).sort((a,b)=>a.dropFrame-b.dropFrame)};
}
