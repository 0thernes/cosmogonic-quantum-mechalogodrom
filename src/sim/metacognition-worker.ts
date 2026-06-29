import { eshkolCompile, eshkolParse, eshkolExecute, moonlabMPOApply } from './tsotchke-facade';

// The worker listens for messages with the SharedArrayBuffer and parameters
self.onmessage = (e) => {
  const { type, buffer, program, surprise, LATENT } = e.data;
  if (type === 'INIT') {
    if (!buffer || !(buffer instanceof SharedArrayBuffer)) {
      return;
    }
    // The buffer is a SharedArrayBuffer of Float32
    const latent = new Float32Array(buffer);

    // We poll or get triggered to run the computation
    self.onmessage = (msgEvent) => {
      if (msgEvent.data.type === 'THINK') {
        const { cliffordBeat } = msgEvent.data;
        if (cliffordBeat % 17 === 0) {
          // Deep Tsotchke: Eshkol compiler VM + Moonlab MPO
          const bc = eshkolCompile(eshkolParse(program));
          const divine = eshkolExecute(bc, surprise);

          // Post divine result back
          self.postMessage({ type: 'DIVINE', divine });

          const mpoOut = moonlabMPOApply(
            {
              matrices: [latent.subarray(0, 4)],
              bondDimension: 1,
              physicalDimension: LATENT,
            },
            latent,
          );

          // Apply results back to the SAB
          for (let i = 0; i < Math.min(LATENT, mpoOut.length); i++) {
            latent[i] = Math.max(-4, Math.min(4, (latent[i] ?? 0) + (mpoOut[i] ?? 0) * 0.008));
          }
        }
      }
    };
  }
};
