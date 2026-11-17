'use strict';
// Seed the trace from colors present across the artwork, including small accents.
function artworkPalette(pixels, limit) {
  const bins = new Map();
  const stride = Math.max(1, Math.floor(pixels.data.length / (4 * 65000)));
  for (let p=0; p<pixels.data.length; p+=4*stride) {
    const [r,g,b,a]=pixels.data.subarray(p,p+4);
    const key=a===0 ? -1 : (r>>3)*32768+(g>>3)*1024+(b>>3)*32+(a>>3);
    const bin=bins.get(key)||{sum:[0,0,0,0],n:0};
    bin.sum[0]+=r;bin.sum[1]+=g;bin.sum[2]+=b;bin.sum[3]+=a;bin.n++;
    bins.set(key,bin);
  }
  function group(points){
    const lo=[255,255,255,255], hi=[0,0,0,0];
    let mass=0;
    for(const p of points){
      mass+=p.weight;
      for(let c=0;c<4;c++){lo[c]=Math.min(lo[c],p.color[c]);hi[c]=Math.max(hi[c],p.color[c]);}
    }
    const ranges=hi.map((v,c)=>v-lo[c]);
    const span=Math.max(...ranges);
    return {points,mass,axis:ranges.indexOf(span),score:span*Math.sqrt(mass)};
  }
  const groups=[group(Array.from(bins.values(),p=>({color:p.sum.map(v=>v/p.n),weight:Math.sqrt(p.n)})))];
  while(groups.length<limit){
    groups.sort((a,b)=>b.score-a.score);
    const box=groups[0];if(!box.score)break;
    const sorted=box.points.sort((a,b)=>a.color[box.axis]-b.color[box.axis]);
    let cut=1,mass=sorted[0].weight;
    while(cut<sorted.length-1 && mass<box.mass/2)mass+=sorted[cut++].weight;
    groups.splice(0,1,group(sorted.slice(0,cut)),group(sorted.slice(cut)));
  }
  return groups.map(box=>{
    const channels=[0,1,2,3].map(c=>Math.round(box.points.reduce((sum,p)=>sum+p.weight*p.color[c],0)/box.mass));
    return {r:channels[0],g:channels[1],b:channels[2],a:channels[3]};
  });
}
function traceArtwork(pixels,options) {
  const data=new Uint8ClampedArray(pixels.data);
  smoothPaint(data,pixels.width,pixels.height,options.paintStrength);
  const image={width:pixels.width,height:pixels.height,data};
  return ImageTracer.imagedataToSVG(image,{...options,pal:artworkPalette(image,options.numberofcolors)});
}
