'use strict';
const el = id => document.getElementById(id);
const canvas = (w,h) => Object.assign(document.createElement('canvas'),{width:w,height:h});
let pixels, sourceName, dimensions, sourceURL, svgURL, worker, generation=0, upload=0;
const levels=['Leve','Média','Alta'];
function flowerPoster(){
  const c=canvas(800,560), g=c.getContext('2d');
  g.fillStyle='#f4d9a7'; g.fillRect(0,0,c.width,c.height);
  const path=(d,fill)=>{g.fillStyle=fill;g.fill(new Path2D(d));};
  path('M313 590 Q460 386 414 152 L424 151 Q488 379 348 590Z','#17493e');
  path('M360 538 Q238 524 175 345 Q304 364 370 495Z','#285746');
  path('M405 442 Q449 300 620 266 Q578 409 405 442Z','#245340');
  path('M337 560 Q462 492 531 377 L537 378 Q475 509 350 562Z','#17493e');
  function bloom(x,y,scale,angle){
    g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
    const reds=['#c64133','#ed573a','#f16e46','#df462f','#ff7549','#e85836'];
    for(let i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);
      path('M-7 8 C-43 -11 -90 -42 -78 -86 C-72 -107 -51 -119 -34 -115 C-18 -135 2 -133 17 -119 C46 -124 63 -104 64 -79 C65 -40 32 -6 6 8Z',reds[i]);g.restore();}
    g.fillStyle='#253b2f';g.beginPath();g.ellipse(0,0,30,23,-.25,0,Math.PI*2);g.fill();
    for(let i=0;i<26;i++){let a=i*2.39996,r=Math.sqrt(i)*4.1;g.fillStyle=i%3?'#cfa55e':'#f6ca77';g.beginPath();g.arc(Math.cos(a)*r,Math.sin(a)*r*.7,2,0,Math.PI*2);g.fill();}g.restore();
  }
  bloom(417,192,1.13,-.3);bloom(534,362,.48,.45);
  // Simulate a scanned print so the example exercises the same cleanup as uploads.
  const low=canvas(420,294),ctx=low.getContext('2d');ctx.drawImage(c,0,0,420,294);
  const img=ctx.getImageData(0,0,420,294);let seed=1723;
  for(let i=0;i<img.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=(seed/4294967296-.5)*45;for(let j=0;j<3;j++)img.data[i+j]+=grain;}
  ctx.putImageData(img,0,0);return low;
}
function install(c,name,w,h,url){
  if(sourceURL) URL.revokeObjectURL(sourceURL);
  sourceURL=url; pixels=c.getContext('2d').getImageData(0,0,c.width,c.height);
  dimensions={w,h};sourceName=name;el('name').textContent=name;el('size').textContent=w+' × '+h+' px';
  el('original').src=url||c.toDataURL();el('vector').removeAttribute('src');trace();
}
async function loadFile(file){
  if(!file)return;
  if(file.size>20*1024*1024||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(file.type)){el('status').textContent='Escolha uma imagem compatível de até 20 MB.';return;}
  const id=++upload,url=URL.createObjectURL(file),image=new Image();
  try{image.src=url;await image.decode();if(id!==upload){URL.revokeObjectURL(url);return;}
    const w=image.naturalWidth,h=image.naturalHeight,k=Math.min(1,2560/Math.max(w,h),Math.sqrt(2000000/(w*h)));
    const c=canvas(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)));c.getContext('2d').drawImage(image,0,0,c.width,c.height);
    install(c,file.name,w,h,url);
  }catch{URL.revokeObjectURL(url);if(id===upload)el('status').textContent='Não foi possível abrir essa imagem.';}
}
async function trace(){
  const id=++generation;worker?.terminate();worker=null;
  const value=Number(el('clean').value);el('level').textContent=levels[value];
  el('save').disabled=true;
  if(el('mode').value==='retouch'){
    el('status').textContent='Limpando manchas…';
    try{
      const image=new Image();image.src=el('original').src;await image.decode();
      if(id!==generation)return;
      const {w,h}=dimensions;
      const scale=Math.min(1,Math.sqrt(8000000/(w*h)),8192/Math.max(w,h));
      const c=canvas(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
      const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);
      const input=ctx.getImageData(0,0,c.width,c.height);
      const putResult=async bytes=>{
        if(id!==generation)return;
        ctx.putImageData(new ImageData(bytes,c.width,c.height),0,0);
        const factor=Math.min(Number(el('scale').value),Math.sqrt(16000000/(c.width*c.height)),8192/Math.max(c.width,c.height));
        let output=c;
        if(factor>1){
          output=canvas(Math.round(c.width*factor),Math.round(c.height*factor));
          const scaled=output.getContext('2d');scaled.imageSmoothingQuality='high';scaled.drawImage(c,0,0,output.width,output.height);
        }
        const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
        if(id!==generation)return;
        if(!blob)throw Error('PNG');
        if(svgURL)URL.revokeObjectURL(svgURL);
        svgURL=URL.createObjectURL(blob);el('vector').src=svgURL;
        el('status').textContent='PNG pronto · '+output.width+' × '+output.height;el('save').disabled=false;
      };
      const fail=()=>{if(id===generation)el('status').textContent='Falha ao limpar a imagem.';};
      if(location.protocol!=='file:'){
        worker=new Worker('retouch-worker.js');
        worker.onmessage=e=>{if(id!==generation)return;worker.terminate();worker=null;putResult(e.data).catch(fail);};
        worker.onerror=fail;worker.postMessage({input,value,paper:el('paper').checked},[input.data.buffer]);
      }else await putResult(removeSpecks(input,value,el('paper').checked));
    }catch{if(id===generation)el('status').textContent='Falha ao limpar a imagem.';}
    return;
  }
  el('status').textContent='Vetorizando…';
  const options={numberofcolors:Number(el('colors').value),colorsampling:2,colorquantcycles:3,pathomit:[1,6,16][value],ltres:[.4,1,1.6][value],qtres:[.4,1,1.6][value],paintStrength:value,blurradius:0,blurdelta:[0,28,45][value],roundcoords:2,viewbox:true};
  function finish(result){
    if(id!==generation)return;worker?.terminate();worker=null;
    if(!result.svg){el('status').textContent='Falha na conversão. Tente reduzir as cores.';return;}
    const factor=el('vectorSize').value==='8k'?7680/Math.max(dimensions.w,dimensions.h):1;
    const w=Math.max(1,Math.round(dimensions.w*factor)),h=Math.max(1,Math.round(dimensions.h*factor));
    const svg=result.svg.replace('<svg ','<svg width="'+w+'" height="'+h+'" ');
    if(svgURL)URL.revokeObjectURL(svgURL);svgURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    el('vector').src=svgURL;el('status').textContent='Vetor pronto · '+w+' × '+h;el('save').disabled=false;
  }
  async function local(){await new Promise(r=>setTimeout(r,30));if(id!==generation)return;try{finish({svg:traceArtwork(pixels,options)});}catch{finish({error:true});}}
  if(location.protocol==='file:'){await local();return;}
  try{worker=new Worker('trace.js');worker.onmessage=e=>finish(e.data);worker.onerror=()=>{if(id===generation){worker?.terminate();worker=null;local();}};worker.postMessage({pixels,options});}catch{await local();}
}
el('colors').onchange=trace;el('clean').oninput=()=>el('level').textContent=levels[el('clean').value];el('clean').onchange=trace;
el('split').oninput=e=>el('stage').style.setProperty('--split',e.target.value+'%');
el('file').onchange=e=>{loadFile(e.target.files[0]);e.target.value='';};
el('drop').ondragover=e=>{e.preventDefault();el('drop').classList.add('over');};
el('drop').ondragleave=()=>el('drop').classList.remove('over');
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{e.preventDefault();el('drop').classList.remove('over');loadFile(e.dataTransfer.files[0]);});
document.addEventListener('paste',e=>{if(e.clipboardData.files.length)loadFile(e.clipboardData.files[0]);});
el('format').onchange=()=>el('save').textContent='↓  Baixar '+el('format').value.toUpperCase();
el('save').onclick=async()=>{
  const format=el('format').value, name=sourceName.replace(/\.[^.]+$/,'')+'-limpo.'+format;let url=svgURL;
  const rasterize=format==='png' && el('mode').value==='vector';
  try{if(rasterize){const image=new Image();image.src=url;await image.decode();const k=el('vectorSize').value==='8k'?1:Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight));const c=canvas(Math.max(1,Math.round(image.naturalWidth*k)),Math.max(1,Math.round(image.naturalHeight*k)));c.getContext('2d').drawImage(image,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/png'));url=URL.createObjectURL(blob);}
    const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();if(rasterize)setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch{el('status').textContent='Falha ao exportar. Tente novamente.';}
};
function setMode(){
  const retouch=el('mode').value==='retouch';
  el('vectorSizeLabel').style.display=retouch?'none':'flex';el('vectorSize').hidden=retouch;
  el('scaleLabel').style.display=retouch?'flex':'none';el('scale').hidden=!retouch;
  el('paperLabel').style.display=retouch?'block':'none';
  el('paletteLabel').style.display=retouch?'none':'';
  el('colors').hidden=retouch;el('format').disabled=retouch;
  el('format').value=retouch?'png':'svg';el('format').onchange();
  document.querySelector('.after').textContent=retouch?'Limpo':'Vetor';
}
el('vectorSize').onchange=trace;el('scale').onchange=trace;el('paper').onchange=trace;
el('mode').onchange=()=>{setMode();trace();};
setMode();
const demo=flowerPoster();install(demo,'Flor de papel',demo.width,demo.height,null);
