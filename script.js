document.addEventListener('DOMContentLoaded', () => {
    const img = document.getElementById('toneImage');
    if (!img) {
        console.error('Initialization failed: Could not find image element.');
        return;
    }

    const scale = Tonal.Scale.get('C major').notes;
    let oscillator = null;

    const startAudio = async () => {
        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
                console.log('AudioContext started on user gesture.');
            } catch (e) {
                console.error('Could not start AudioContext:', e);
            }
        }
    };

    img.addEventListener('mouseenter', async () => {
        await startAudio();

        if (Tone.context.state !== 'running') {
            console.warn('AudioContext not running. Hover might not have been a strong enough user gesture.');
            return;
        }

        if (!oscillator) {
            oscillator = new Tone.Oscillator({
                type: 'sine',
                frequency: 440
            }).toDestination();
            oscillator.start();
        }
    });

    img.addEventListener('mousemove', async (e) => {
        await startAudio();

        if (!oscillator) {
            // If mouseenter didn't create it (e.g., page loaded with cursor already over image)
            if (Tone.context.state === 'running') {
                oscillator = new Tone.Oscillator({
                    type: 'sine',
                    frequency: 440
                }).toDestination();
                oscillator.start();
            } else {
                return; // Audio not ready, do nothing
            }
        }

        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const imgWidth = rect.width;
        const imgHeight = rect.height;

        const noteIndex = Math.floor((x / imgWidth) * scale.length);
        const note = scale[noteIndex % scale.length];

        const minOctave = 2;
        const maxOctave = 6;
        const octave = Math.round(maxOctave - (y / imgHeight) * (maxOctave - minOctave));
        const newNote = `${note}${octave}`;

        const freq = Tonal.Note.freq(newNote);
        if (freq) {
            oscillator.frequency.rampTo(freq, 0.05);
        }
    });

    img.addEventListener('mouseleave', () => {
        if (oscillator) {
            oscillator.stop();
            oscillator.dispose();
            oscillator = null;
        }
    });
});