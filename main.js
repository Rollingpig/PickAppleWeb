import {levelId,levelText,parseLevelText,validateLevel} from './level-format.js';
import {createMovementInput} from './movement-input.js';
const $=selector=>document.querySelector(selector);
const canvas=$('#gameCanvas'),ctx=canvas.getContext('2d'),controls=$('#controls');
const FPS=24,W=480,H=800;
const imageNames=['menu-art','menu-lettering','collections','edit-select','levels','rank','about','export','update','upgrade','game-ui','pause-ui','score-ui','score-name-ui','chick','chick-hit','explosion','minus-time','apple','gold','bomb','card','level-row','list-row','editor','editor-options','lock-on'];
const art={},backgrounds={};
let levels=[],custom=[],scores={},state='loading',group=0,mode='play',offset=0,current=null,game=null,editor=null,options=false;
let last=0,accumulator=0,animationClock=0,noticeTimer,hits={},animations={},networkLevels=[],updateRequest=null;
const RESOURCE='https://raw.githubusercontent.com/Rollingpig/PickingAppleGame/master/resource/';
const VERSION=40;
const keys=createMovementInput();
const groups=[{key:'Classic',title:'初始关卡集'},{key:'Custom',title:'我的作品集'},{key:'Archive',title:'网络关卡集'}];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notice('浏览器无法保存数据，请导出关卡备份。');}};
const seconds=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.max(0,n)%60).padStart(2,'0')}`;
const all=()=>[...levels,...custom,...networkLevels];
const title=level=>level.name||level.title;
const collection=()=>all().filter(level=>level.group===groups[group].key);
const high=level=>scores[level.id]?.[0]?.score??'None';
const clone=value=>structuredClone(value);
function storeCustom(level){const index=custom.findIndex(l=>l.id===level.id);if(index<0)custom.push(level);else custom[index]=level;write('pick-custom-v1',custom);}
function authorLabel(level,x,y,w){if(!level.author?.trim())return;const node=letter('',`作者：${level.author.trim()}`,x,y,w,20,16,'level-author');node.title=level.author;node.setAttribute('aria-label',`作者：${level.author}`);}
function notice(message){$('#notice').textContent=message;$('#notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('visible'),2300);}
function position(node,x,y,w,h){Object.assign(node.style,{left:`${x/W*100}%`,top:`${y/H*100}%`,width:`${w/W*100}%`,height:`${h/H*100}%`});return node;}
function hit(label,x,y,w,h,action,kind='hit'){const node=document.createElement('button');node.className=kind;node.type='button';node.textContent=label;node.setAttribute('aria-label',label);node.dataset.action=label;position(node,x,y,w,h);node.addEventListener('click',action);controls.append(node);return node;}
function nativeHit(label,page,name,action,dx=0,dy=0){const rect=hits[page]?.[name];if(!rect)throw Error(`缺少按钮坐标 ${page}/${name}`);return hit(label,rect[0]+dx,rect[1]+dy,rect[2],rect[3],action);}
function letter(id,value,x,y,w,h,size,kind){const node=document.createElement('span');node.id=id;node.className=`letter ${kind}`;node.textContent=value;node.style.setProperty('--size',size);position(node,x,y,w,h);$('#typography').append(node);return node;}
function input(id,value,x,y,w,h,size=30,type='text'){const node=document.createElement('input');node.id=id;node.className='field';node.type=type;node.value=value;node.setAttribute('aria-label',id);node.style.setProperty('--size',size);position(node,x,y,w,h);controls.append(node);return node;}
function panel(text,x,y,w,h,size=25){const node=document.createElement('div');node.className='scroll-panel';node.textContent=text;node.style.setProperty('--size',size);position(node,x,y,w,h);controls.append(node);return node;}
function pageCopy(value,x,y,w,h,size=25){const node=panel(value,x,y,w,h,size);node.classList.add('page-copy');return node;}
function screen(name){state=name;keys.reset();controls.replaceChildren();$('#typography').replaceChildren();accumulator=0;}
function menu(){game=null;editor=null;screen('menu');
  const labelArt=document.createElement('img');labelArt.src=art['menu-lettering'].src;labelArt.className='menu-lettering';$('#typography').append(labelArt);
  letter('menuAnniversary','12周年web重制版',40,300,400,32,24,'menu-anniversary');
  nativeHit('开始','menu','selectList_btn',()=>collections());
  nativeHit('DIY','menu','selectEdit_btn',()=>editSelection());
  nativeHit('关卡导出','menu','selectOutput_btn',()=>{group=1;mode='export';offset=0;levelSelection();});
  nativeHit('关于','menu','about_btn',()=>about());
  nativeHit('获取更新','menu','checkUpdate_btn',()=>update());
  nativeHit('退出','menu','exit_btn',()=>exitScreen());
}
function collections(){game=null;mode='play';screen('collections');
  groups.forEach((g,i)=>{const x=100+(i-group)*300,left=Math.max(0,x),right=Math.min(480,x+280);if(right>left)hit(g.title,left,175,right-left,395,()=>{group=i;offset=0;levelSelection();});});
  nativeHit('上一关卡集','collections','left_btn',()=>{group=Math.max(0,group-1);collections();}).disabled=group===0;
  nativeHit('下一关卡集','collections','right_btn',()=>{group=Math.min(2,group+1);collections();}).disabled=group===2;
  nativeHit('返回','collections','exseList_btn',menu);
}
function levelSelection(){game=null;screen(mode==='edit'?'edit-levels':'levels');const list=collection(),count=mode==='edit'?5:7,startY=mode==='edit'?260:125;
  list.slice(offset,offset+count).forEach((level,index)=>{
    const y=startY+index*85;
    authorLabel(level,mode==='play'?157:262,y+4,mode==='play'?151:164);
    hit(`关卡 ${title(level)}`,40,y,mode==='play'?275.0098:398.0127,80,()=>{current=level;if(mode==='edit')openEditor(level);else if(mode==='export')exportScreen(level);else start(level);});
    if(mode==='play')hit(`${title(level)} 高分榜`,323,y,102.9858,80.0146,()=>rank(level));
  });
  const page=mode==='edit'?'edit-select':'levels';
  nativeHit('返回',page,mode==='edit'?'exedLevel_btn':'back_btn',()=>mode==='play'?collections():mode==='edit'?editSelection():menu());
  nativeHit('上翻',page,'up_btn',()=>{offset=Math.max(0,offset-1);levelSelection();}).disabled=offset===0;
  nativeHit('下翻',page,'down_btn',()=>{offset=Math.min(Math.max(0,list.length-count),offset+1);levelSelection();}).disabled=offset>=Math.max(0,list.length-count);
  if(mode==='edit')nativeHit('新建空白关卡','edit-select','blank_btn',()=>openEditor());
  if(mode==='export')hit('导入',350,35,105,45,()=>$('#importFile').click(),'wood');
}
function editSelection(){screen('edit-select');mode='edit';
  nativeHit('新建空白关卡','edit-select','blank_btn',()=>openEditor());
  groups.forEach((item,index)=>hit(item.title,40,260+index*85,400,80,()=>{group=index;offset=0;levelSelection();}));
  nativeHit('返回','edit-select','exedLevel_btn',menu);
  nativeHit('上翻','edit-select','up_btn',()=>{}).disabled=true;
  nativeHit('下翻','edit-select','down_btn',()=>{}).disabled=true;
}
function rank(level){current=level;screen('rank');const rows=scores[level.id]||[];
  authorLabel(level,260,116,172);
  panel(title(level),46,140,390,60,45);
  panel(rows.length?rows.map((row,i)=>`${i+1}.  ${row.name}  ${row.score}`).join('\n'):'暂无记录',45,240,390,440,35);
  nativeHit('关卡','rank','exRank_btn',levelSelection);
}
async function fetchText(url,options={}){const response=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error(`HTTP ${response.status}`);return response.text();}
async function about(){screen('about');nativeHit('回菜单','about','exAbout_btn',menu);
  const body=panel('正在读取…',54.5,267,371,405.55,27);body.classList.add('about-copy');
  try{body.textContent=await fetchText('data/about.txt',{cache:'no-store'});}catch{body.textContent='作者：Li D.R.\nPick! — 原 ActionScript / Adobe AIR 游戏的网页移植。';}
}
function update(){screen('update');nativeHit('回菜单','update','exUp_btn',menu);
  pageCopy('请先确保网络连接稳定可靠。\n点击“更新”，程序将访问网络，检查新的关卡和版本信息。\n建议在 WLAN 环境下进行。\n更新未完成，请勿离开本界面。',54,141.15,371,201.75);
  nativeHit('开始更新','update','startUpdate_btn',beginUpdate);
  panel('准备连接原版关卡目录…',60,465,360,165,27).classList.add('update-feedback');
}
async function beginUpdate(){
  const request={pending:[],version:VERSION};updateRequest=request;
  const button=$('[aria-label="开始更新"]');if(button)button.disabled=true;
  const feedback=$('.update-feedback');request.feedback=feedback;feedback.textContent='正在连接…';
  try{
    const xml=new DOMParser().parseFromString(await fetchText(`${RESOURCE}onlinelevels.xml`),'application/xml');
    if(xml.querySelector('parsererror'))throw Error('更新目录格式错误');
    if(updateRequest!==request)return;
    request.version=Number(xml.documentElement.getAttribute('version'))||VERSION;
    const known=new Set(all().filter(l=>l.group==='Archive').map(l=>l.id));
    request.pending=[...xml.querySelectorAll('level')].map(node=>({id:node.querySelector('id')?.textContent.trim(),name:node.querySelector('name')?.textContent.trim()})).filter(l=>/^[a-f0-9]{32}$/.test(l.id)&&!known.has(l.id));
    if(request.version>VERSION){screen('upgrade');pageCopy('发现程序新版本！\n点击“下载更新”获取原版 APK。',54,141.15,371,87.85,23);pageCopy('或者仅更新关卡',54,331.15,371,27.95,23);request.feedback=panel(`最新版本：${request.version}\n当前版本：${VERSION}`,60,465,360,165,27);request.feedback.classList.add('update-feedback');nativeHit('回菜单','upgrade','exUp_btn',menu);nativeHit('下载原版 APK','upgrade','download_btn',()=>window.open('https://raw.githubusercontent.com/Rollingpig/PickingAppleGame/master/demo/Pick!.apk','_blank','noopener'));nativeHit('继续更新关卡','upgrade','continue_btn',()=>downloadUpdates(request));}
    else await downloadUpdates(request);
  }catch(error){feedback.textContent=`连接失败：${error.message}\n已内置的关卡仍可游玩。`;if(button)button.disabled=false;if(state==='update')hit('查看关卡',145,642,190,50,()=>{group=2;mode='play';offset=0;levelSelection();},'wood');}
}
async function downloadUpdates(request){
  if(updateRequest!==request)return;
  const continuation=$('[aria-label="继续更新关卡"]');if(continuation)continuation.disabled=true;
  try{for(let i=0;i<request.pending.length;i++){
    const entry=request.pending[i];request.feedback.textContent=`关卡下载 ${i+1}/${request.pending.length}`;
    const source=validateLevel(parseLevelText(await fetchText(`${RESOURCE}${entry.id}.txt`)));
    if(updateRequest!==request)return;
    await prepareBackground(source.background);
    networkLevels.push({...source,id:entry.id,name:entry.name||source.title,group:'Archive'});write('pick-network-v1',networkLevels);
  }request.feedback.textContent=request.pending.length?'关卡下载完毕，更新程序结束':'无可用关卡更新，更新程序结束';}
  catch(error){request.feedback.textContent=`下载失败：${error.message}\n已完成的下载已保存。`;}
  if(['update','upgrade'].includes(state))hit('查看关卡',145,642,190,50,()=>{group=2;offset=0;mode='play';levelSelection();},'wood');
}
function exitScreen(){write('pick-custom-v1',custom);write('pick-records-v1',scores);screen('exit');hit('返回游戏',145,450,190,65,menu,'wood');}
function exportScreen(level){screen('export');
  pageCopy('点击下方 TXT 或 JSON 按钮下载关卡文件，可将文件发送给其他玩家。\n关卡内容 ID：',54,141.15,371,136.5,27);
  pageCopy('也可以复制下方的关卡文本，发送给其他玩家：',54,362.15,371,65.5,25);
  const raw=levelText(level);panel(levelId(level),60,296,360,48,18).classList.add('export-id');
  panel(raw,60,443.85,357,223.1,20).classList.add('export-data');
  nativeHit('回菜单','export','exOut_btn',menu);
  hit('TXT',210,720,90,60,()=>download(level,'txt'),'wood');
  hit('JSON',315,720,130,60,()=>download(level,'json'),'wood');
}
function download(level,format){const raw=format==='txt'?levelText(level):JSON.stringify(level,null,2);const url=URL.createObjectURL(new Blob([raw],{type:format==='txt'?'text/plain;charset=utf-8':'application/json'}));const a=document.createElement('a');a.href=url;a.download=`Pick-${level.title}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function start(level){current=level;editor=null;screen('game');game={frame:0,time:level.time,score:0,combo:0,maxCombo:0,caught:0,miss:0,bombs:0,x:187.9,next:0,items:[],effects:[],hurtFrames:0,explosion:null,paused:false,finished:false};gameControls();}
function gameControls(){controls.replaceChildren();
  nativeHit('暂停','game','menu_btn',pause);
  const movementButtons={};
  for(const [label,direction,name] of [['向左','left','leftBtn'],['向右','right','rightBtn']]){
    const node=nativeHit(label,'game',name,()=>{});
    movementButtons[direction]=node;
  }
  keys.bind(movementButtons);
  letter('timeValue',seconds(game.time),126.05,11.05,128.4,48.8,40,'time');
  letter('scoreValue',game.score,302,4,163,61,50,'score');
  letter('comboValue','',270.8,75.05,197.65,48.8,40,'combo');
}
function pause(){if(!game||game.finished)return;game.paused=true;screen('pause');
  nativeHit('继续游戏','pause','resume_btn',resume);
  nativeHit('重玩游戏','pause','replay_btn',()=>start(current));
  nativeHit('结束游戏','pause','end_btn',()=>{game=null;levelSelection();});
  letter('timeValue',seconds(game.time),126.05,11.05,128.4,48.8,40,'time');letter('scoreValue',game.score,302,4,163,61,50,'score');letter('comboValue','',270.8,75.05,197.65,48.8,40,'combo');
}
function resume(){if(!game)return;game.paused=false;screen('game');gameControls();}
function finish(){game.finished=true;screen('score');nativeHit('OK','score','next_btn',scoreName);}
function scoreName(){screen('score-name');const node=input('playerName','player',93.5,214.4,293,45,40);node.maxLength=10;
  nativeHit('记录成绩','score-name','backLevel_btn',()=>{
    const name=node.value.trim()||'player';scores[current.id]||=[];scores[current.id].push({name,score:game.score,date:Date.now()});scores[current.id].sort((a,b)=>b.score-a.score);write('pick-records-v1',scores);group=groups.findIndex(g=>g.key===current.group);mode='play';game=null;levelSelection();
  });
}
function event(item){const g=game,kind=item.type==='bomb'?'minus':'plus';
  g.effects=g.effects.filter(e=>e.kind!==kind);
  if(item.type==='n'){g.combo++;g.caught++;g.maxCombo=Math.max(g.maxCombo,g.combo);const points=Math.min(10,Math.floor(g.combo/3)+1);g.score+=points;g.effects.push({kind,x:item.x,text:`+${points}`,age:1});}
  if(item.type==='gold'){g.score+=7;g.effects.push({kind,x:item.x,text:'+7',age:1});}
  if(item.type==='bomb'){g.time-=3;g.bombs++;g.hurtFrames=animations.chickHitFrames;g.explosion={x:item.x,age:0};g.effects.push({kind,x:item.x,age:1});}
}
function step(){if(!game||game.paused||game.finished)return;const g=game;g.frame++;
  const direction=Number(keys.right)-Number(keys.left);g.x=Math.max(0,Math.min(386.5,g.x+direction*current.chickSpeed));
  if(g.frame%24===0){if(g.time>0)g.time--;else{finish();return;}}
  while(g.next<current.sequence.length&&current.sequence[g.next].dropFrame<=g.frame){const item=current.sequence[g.next++];if(g.items.length<30)g.items.push({...item,y:-30});}
  for(const item of g.items){
    const box={n:[0,-1,51,52],gold:[-7.65,-1.85,62,61.6],bomb:[-4.55,-15.05,57,71.4]}[item.type];
    if(item.x+box[0]+box[2]>g.x+7.95&&item.x+box[0]<g.x+86.95&&item.y+box[1]+box[3]>562.5&&item.y+box[1]<588.8){item.dead=true;event(item);}
    else if(item.y>700){item.dead=true;if(item.type==='n'){g.miss++;g.combo=0;}}
    else item.y+=item.vy;
  }
  g.items=g.items.filter(item=>!item.dead);
}
function animate(){if(!game)return;if(game.hurtFrames>0)game.hurtFrames--;if(game.explosion&&++game.explosion.age>=animations.explosionFrames)game.explosion=null;game.effects=game.effects.filter(e=>++e.age<animations.popupFrames);}
function tween(points,age){let before=points[0];for(const after of points.slice(1)){if(age<=after.frame)return before.value+(after.value-before.value)*(age-before.frame)/(after.frame-before.frame);before=after;}return before.value;}

function openEditor(level=null){game=null;editor={level:level?clone(level):{id:`custom-${Date.now()}`,group:'Custom',title:'自定义',time:30,chickSpeed:12,background:'level1.png',sequence:[]},page:0,type:'n',lock:true};
  if(level&&level.group!=='Custom'){editor.level.id=`custom-${Date.now()}`;editor.level.group='Custom';}
  options=false;editorControls();
}
function editorControls(){screen('editor');const e=editor;
  const title=input('levelTitle',e.level.title,128.8,19.65,243,45,37);title.maxLength=60;title.addEventListener('input',()=>e.level.title=title.value);
  nativeHit('更多设置','editor','more_btn',()=>{options=!options;editorControls();});
  for(const [type,x,label] of [['n',21.3,'苹果'],['gold',99.3,'金星'],['bomb',177.3,'炸弹']])nativeHit(label,'editor',`type${type}`,()=>{e.type=type;editorControls();});
  nativeHit('上一时间段','editor','b_btn',()=>{e.page=Math.max(0,e.page-1);editorControls();});
  nativeHit('下一时间段','editor','f_btn',()=>{e.page=Math.min(Math.ceil(e.level.time/2)-1,e.page+1);editorControls();});
  nativeHit('存储','editor','save_btn',saveEditor);
  nativeHit('返回','editor','back_btn',menu);
  if(options){
    const shield=document.createElement('div');shield.id='optionsShield';controls.append(shield);
    // Coordinates are the original moreopt symbol's field positions + its stage offset.
    const time=input('duration',e.level.time,128.8,79.65,83,42,30,'number');time.min=2;time.max=300;time.addEventListener('change',()=>e.level.time=Math.max(2,Math.min(300,Number(time.value)||30)));
    const speed=input('chickSpeed',e.level.chickSpeed,128.8,196.7,83,42,30,'number');speed.min=1;speed.max=30;speed.addEventListener('change',()=>e.level.chickSpeed=Math.max(1,Math.min(30,Number(speed.value)||12)));
    const background=input('background',e.level.background,125.95,137.65,243,42,23);background.addEventListener('change',async()=>{try{const checked=validateLevel({...e.level,background:background.value});e.level.background=checked.background;await prepareBackground(checked.background);}catch(error){notice(error.message);}});
    letter('authorLabel','作者',264,196.7,190,30,23,'');
    const author=input('levelAuthor',e.level.author||'',264,231,200,40,24);author.classList.add('author-field');author.maxLength=40;author.placeholder='可选';author.setAttribute('aria-label','关卡作者');author.addEventListener('input',()=>e.level.author=author.value);

    hit('速度锁定',198.95,257.35,45,45,()=>{e.lock=!e.lock;editorControls();});
  }
}
function saveEditor(){try{const l=validateLevel({...editor.level,title:editor.level.title.trim()||'自定义'});l.name=l.title;l.group='Custom';l.sequence=l.sequence.filter(item=>item.reachFrame<=l.time*24);l.id=levelId(l);storeCustom(l);editor=null;menu();notice('关卡已保存到「我的作品集」');}catch(error){notice(error.message);}}

canvas.addEventListener('pointerdown',e=>{
  if(state!=='editor'||options)return;const bounds=canvas.getBoundingClientRect();const x=(e.clientX-bounds.left)*480/bounds.width,y=(e.clientY-bounds.top)*800/bounds.height;if(y<80||y>620)return;
  const ed=editor;const index=ed.level.sequence.findIndex(item=>item.reachFrame>=ed.page*48&&item.reachFrame<(ed.page+1)*48&&Math.hypot(item.x+25-x,80+((ed.page+1)*48-item.reachFrame)/48*540+25-y)<30);
  if(index>=0)ed.level.sequence.splice(index,1);else{if(ed.level.sequence.filter(i=>i.reachFrame>=ed.page*48&&i.reachFrame<(ed.page+1)*48).length>=20){notice('当前时间段最多放置 20 个物品');return;}const reachFrame=Math.trunc((ed.page+1)*48-(y-25-80)/540*48),vy=ed.lock?13:7+Math.floor(Math.random()*12);ed.level.sequence.push({type:ed.type,x:Math.round(x-25),vy,dropFrame:reachFrame-Math.floor(563/vy),reachFrame});}
});

function image(name,x=0,y=0,w=480,h=800){const img=art[name];if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x,y,w,h);}
function background(name='menu.png'){const img=backgrounds[name]||backgrounds['level.png'];if(img?.complete&&img.naturalWidth)ctx.drawImage(img,0,0,W,H);else{ctx.fillStyle='#6495ff';ctx.fillRect(0,0,W,H);}}
function text(value,x,y,size=30,color='#fff',align='left',font='Microsoft YaHei',maxWidth){ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.font=`${size}px "${font}",sans-serif`;if(maxWidth)ctx.fillText(String(value),x,y,maxWidth);else ctx.fillText(String(value),x,y);}
function sprite(item){const kind=item.type==='n'?'apple':item.type;image(kind,item.x-10,item.y-16,70,78);}
function rows(items,y=125){items.slice(offset,offset+7).forEach((l,i)=>{const yy=y+i*85;image('level-row',38,yy-2,404,84);text(offset+i+1,69,yy+22,35,'#fff','center');text(title(l),97,yy+25,30,'#fff','left','Microsoft YaHei',211);text(high(l),375,yy+40,25,'#fff','center');});if(!items.length)text('暂无关卡',240,y+22,35,'#ffff66','center');}
function hud(){if($('#timeValue'))$('#timeValue').textContent=seconds(game.time);if($('#scoreValue'))$('#scoreValue').textContent=game.score;if($('#comboValue'))$('#comboValue').textContent=game.combo>=3?`COMBO ${game.combo}x`:'';}
function gameArt(){background(current.background);image(game.hurtFrames?'chick-hit':'chick',game.x-2,484.95,116,175);canvas.dataset.chickFrame=game.hurtFrames?'hurt':'normal';for(const item of game.items)sprite(item);
  if(game.explosion){const scale=tween(animations.explosion.Scale_X,game.explosion.age)/100;ctx.save();ctx.translate(game.explosion.x+71.8,562.15);ctx.scale(scale,scale);image('explosion',-73.8,-68.15,153,133);ctx.restore();}
  image('game-ui');hud();$('#typography').querySelectorAll('[data-effect]').forEach(n=>n.remove());
  for(const effect of game.effects){const y=467.5+tween(animations.popup.Motion_Y,effect.age);const node=letter('',effect.text||'',effect.x+2,y,effect.kind==='plus'?95:132,65,55,'popup');node.dataset.effect='true';node.style.opacity=tween(animations.popup.Alpha_Amount,effect.age)/100;if(effect.kind==='minus'){const img=document.createElement('img');img.src=art['minus-time'].src;img.className='popup-art';node.append(img);}else node.style.color='#fff';}
}

function draw(){ctx.clearRect(0,0,W,H);
  if(state==='game'||state==='pause'){gameArt();if(state==='pause'){image('pause-ui');hud();}return;}
  background();
  if(state==='loading'){text('正在加载…',240,380,28,'#ffff66','center');return;}
  if(state==='menu'){image('menu-art');return;}
  if(state==='collections'){image('collections');groups.forEach((g,i)=>{const x=100+(i-group)*300;image('card',x-5,170,290,405);text(g.title,x+141.6,416,35,'#000','center');text(g.title,x+140.1,412.5,35,'#ffff66','center');text(all().filter(l=>l.group===g.key).length,x+164,480,35,'#312213','center');});return;}
  if(state==='levels'||state==='edit-levels'){image(state==='edit-levels'?'edit-select':'levels');if(mode==='play')rows(collection());else collection().slice(offset,offset+(mode==='edit'?5:7)).forEach((l,i)=>{const yy=(mode==='edit'?260:125)+i*85;image('list-row',38,yy-2,404,84);text(offset+i+1,69,yy+22,35,'#fff','center');text(title(l),97,yy+25,30,'#fff','left','Microsoft YaHei',330);});return;}
  if(state==='edit-select'){image('edit-select');groups.forEach((g,i)=>{image('list-row',38,258+i*85,404,84);text(i+1,69,282+i*85,35,'#fff','center');text(g.title,97,285+i*85,30);});return;}
  if(state==='score'){background(current.background);image('chick',game.x-2,484.95,116,175);image('score-ui');text(game.score,237.5,282,80,'#fff','center','Impact');text(`${game.caught}/${game.caught+game.miss}`,256,126,40,'#999');text(game.maxCombo,256,173,40,'#999');return;}
  if(state==='score-name'){background(current.background);image('chick',game.x-2,484.95,116,175);image('score-name-ui');return;}
  if(state==='editor'){ctx.fillStyle='#333';ctx.fillRect(0,0,480,800);image('editor');for(const item of editor.level.sequence){if(item.reachFrame<editor.page*48||item.reachFrame>=(editor.page+1)*48)continue;sprite({...item,y:80+((editor.page+1)*48-item.reachFrame)/48*540});}text(`${seconds(editor.page*2)}-${seconds(editor.page*2+2)}`,81.5,741.95,35);const xx={n:21.3,gold:99.3,bomb:177.3}[editor.type];ctx.strokeStyle='#ffff66';ctx.lineWidth=3;ctx.strokeRect(xx,666,60,60);if(options){image('editor-options',0,74);if(editor.lock)image('lock-on',196.95,255.35,49,49);}return;}
  if(state==='exit'){ctx.fillStyle='#000b';ctx.fillRect(0,0,480,800);text('感谢游玩 Pick!',240,325,38,'#ffff66','center');return;}
  image(state);
}
function loop(time){const delta=Math.min(100,time-last);last=time;animationClock+=delta;while(animationClock>=1000/FPS){animate();animationClock-=1000/FPS;}if(state==='game'&&game&&!game.paused&&!game.finished){accumulator+=delta;while(accumulator>=1000/FPS){step();accumulator-=1000/FPS;}}draw();requestAnimationFrame(loop);}
function importLevel(file){const reader=new FileReader();reader.onload=async()=>{try{const raw=String(reader.result);const level=validateLevel(raw.trim().startsWith('{')?JSON.parse(raw):parseLevelText(raw));level.group='Custom';level.id=levelId(level);await prepareBackground(level.background);storeCustom(level);group=1;offset=0;mode='play';levelSelection();notice('导入完成');}catch(error){notice(`无法导入：${error.message}`);}};reader.readAsText(file);}

$('#importFile').addEventListener('change',e=>{if(e.target.files?.[0])importLevel(e.target.files[0]);e.target.value='';});
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if(['arrowleft','arrowright','a','d',' ','escape'].includes(key))e.preventDefault();if(state==='game'){keys.setKey(key,true);if((key===' '||key==='escape')&&!e.repeat)pause();}else if(state==='pause'&&(key===' '||key==='escape')&&!e.repeat)resume();});
document.addEventListener('keyup',e=>keys.setKey(e.key.toLowerCase(),false));
window.addEventListener('blur',()=>{keys.reset();if(state==='game')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='game')pause();});
async function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.onload=img.onerror=null;reject(Error('图片加载超时'));},8000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error(url));};img.src=url;});}
async function prepareBackground(name){if(backgrounds[name])return;try{backgrounds[name]=await loadImage(name);}catch{backgrounds[name]=backgrounds['level.png'];}}
async function init(){try{const tasks=[...imageNames.map(async name=>art[name]=await loadImage(`assets/original/${name}.svg`)),...['menu.png','level.png','level1.png','level2.png','level3.png','trial.png'].map(async name=>backgrounds[name]=await loadImage(`assets/backgrounds/${name}`))];const [converted,regions,timeline]=await Promise.all(['levels','hit-regions','animations'].map(async name=>{const response=await fetch(`data/${name}.json`,{cache:'no-store'});if(!response.ok)throw Error('数据读取失败');return response.json();}));hits=regions;animations=timeline;levels=converted.filter(level=>level.group!=='Custom');await Promise.all(tasks);custom=read('pick-custom-v1',converted.filter(level=>level.group==='Custom'));networkLevels=read('pick-network-v1',[]);scores=read('pick-records-v1',{});await Promise.all([...custom,...networkLevels].map(l=>prepareBackground(l.background)));menu();}catch(error){notice(`加载失败：${error.message}`);}}
init();requestAnimationFrame(loop);
