let reverseSfxCache: AudioBuffer | null = null;

export const playReverseSound = (url: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBuffer = (buffer: AudioBuffer) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.5; // Default volume for reverse effect
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
    };

    if (reverseSfxCache) {
        playBuffer(reverseSfxCache);
        return;
    }

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            const numChannels = audioBuffer.numberOfChannels;
            const reversedBuffer = audioCtx.createBuffer(
                numChannels, 
                audioBuffer.length, 
                audioBuffer.sampleRate
            );
            
            for (let i = 0; i < numChannels; i++) {
                const channelData = audioBuffer.getChannelData(i);
                const reversedData = reversedBuffer.getChannelData(i);
                for (let j = 0; j < audioBuffer.length; j++) {
                    reversedData[j] = channelData[audioBuffer.length - 1 - j];
                }
            }
            
            reverseSfxCache = reversedBuffer; // Cache it
            playBuffer(reversedBuffer);
        })
        .catch(e => console.error("Error loading reverse audio:", e));
};
