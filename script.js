document.addEventListener('DOMContentLoaded', () => {
    // This function runs only after the entire HTML document has been loaded.

    const img = document.getElementById('toneImage');
    const statusDiv = document.getElementById('status');
    
    // Check if essential elements were found
    if (!img || !statusDiv) {
        console.error('Initialization failed: Could not find image or status element.');
        return;
    }

    // User interaction to start AudioContext.
    document.documentElement.addEventListener('click', async () => {
        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
                console.log('AudioContext started');
                statusDiv.textContent = 'Audio ready! Hover the image.';
            } catch (e) {
                console.error('Could not start AudioContext:', e);
                statusDiv.textContent = 'Audio could not be started.';
            }
        }
    });

    const scale = Tonal.Scale.get('C major').notes;
    let oscillator = null;

    img.addEventListener('mouseenter', () => {
        // Check if audio context is running before creating an oscillator
        if (Tone.context.state !== 'running') {
            statusDiv.textContent = 'Please click the page to enable audio.';
            console.warn('AudioContext not running. Please click the page first.');
            return;
        }

        // Create a new oscillator, connect it to the output, and start it
        oscillator = new Tone.Oscillator({
            type: 'sine',
            frequency: 440 // Start with a default frequency
        }).toDestination();
        oscillator.start();
    });

    img.addEventListener('mousemove', (e) => {
        // Don't do anything if the oscillator hasn't been created
        if (!oscillator) return;

        // Get mouse position relative to the image
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const imgWidth = rect.width;
        const imgHeight = rect.height;

        // Map X to a note
        const noteIndex = Math.floor((x / imgWidth) * scale.length);
        const note = scale[noteIndex % scale.length];

        // Map Y to an octave
        const minOctave = 2;
        const maxOctave = 6;
        const octave = Math.round(maxOctave - (y / imgHeight) * (maxOctave - minOctave));
        const newNote = `${note}${octave}`;

        // Tonal.Note.freq can return undefined if the note name is invalid
        const freq = Tonal.Note.freq(newNote);
        if (freq) {
            // rampTo provides a smooth transition between frequencies
            oscillator.frequency.rampTo(freq, 0.05);
        }
    });

    img.addEventListener('mouseleave', () => {
        if (oscillator) {
            // Stop the sound, then dispose of the oscillator to clean up
            oscillator.stop();
            oscillator.dispose();
            oscillator = null;
        }
    });
});
