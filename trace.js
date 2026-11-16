importScripts('imagetracer_v1.2.6.js');
self.onmessage = ({data}) => {
  try { self.postMessage({svg: ImageTracer.imagedataToSVG(data.pixels, data.options)}); }
  catch { self.postMessage({error:true}); }
};
