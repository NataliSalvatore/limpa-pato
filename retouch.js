'use strict';
// Replace a local outlier only when samples on every side agree on its surroundings.
function removeSpecks(image, strength, cleanPaper = false) {
  const {data, width, height} = image;
  const result = new Uint8ClampedArray(data);
  const threshold = [42, 32, 25][strength];
  const tolerance = [12, 16, 20][strength];
  for (let radius = 1; radius <= strength + 1; radius++) {
    const dx = radius * 4, dy = dx * width;
    const offsets = [-dx, dx, -dy, dy, -dx-dy, dx+dy, dx-dy, dy-dx];
    for (let y = radius; y < height-radius; y++) {
      for (let x = radius; x < width-radius; x++) {
        const p = (y*width+x)*4, left = p-dx;
        if (data[p+3] === 0 || Math.max(Math.abs(data[p]-data[left]), Math.abs(data[p+1]-data[left+1]), Math.abs(data[p+2]-data[left+2])) < threshold) continue;
        let r=0, g=0, b=0, count=0;
        for (const offset of offsets) {
          const q = p+offset;
          if (data[q+3] !== data[p+3] || Math.max(Math.abs(data[q]-data[left]),Math.abs(data[q+1]-data[left+1]),Math.abs(data[q+2]-data[left+2])) > tolerance) break;
          r+=data[q]; g+=data[q+1]; b+=data[q+2]; count++;
        }
        if (count===offsets.length) {
          result[p]=r/count; result[p+1]=g/count; result[p+2]=b/count;
        }
      }
    }
  }
  if (cleanPaper) whitenPaper(result,width,height);
  return result;
}

// Only the nearly white, neutral paper reachable from the outer edge is eligible.
function whitenPaper(data,width,height) {
  const visited=new Uint8Array(width*height), queue=new Int32Array(width*height);
  let head=0,tail=0;
  function add(n){
    if(visited[n])return;
    visited[n]=1;
    const i=n*4,low=Math.min(data[i],data[i+1],data[i+2]);
    if(data[i+3]!==255 || low<245 || Math.max(data[i],data[i+1],data[i+2])-low>5)return;
    queue[tail++]=n;
    // Taper gently into off-white edges.
    const amount=Math.min(1,(low-245)/6);
    for(let c=0;c<3;c++)data[i+c]+=(255-data[i+c])*amount;
  }
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  while(head<tail){
    const n=queue[head++],x=n%width;
    if(x)add(n-1);if(x+1<width)add(n+1);
    if(n>=width)add(n-width);if(n+width<queue.length)add(n+width);
  }
}
