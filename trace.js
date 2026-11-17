importScripts('imagetracer_v1.2.6.js','retouch.js','vector.js');
self.onmessage = ({data}) => {
  try { self.postMessage({svg: traceArtwork(data.pixels, data.options)}); }
  catch { self.postMessage({error:true}); }
};
