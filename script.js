document.addEventListener('DOMContentLoaded', () => {
    const modeSwitch = document.getElementById('modeSwitch');
    const switchLabel = document.querySelector('.switch-label');
    const imageContainer = document.querySelector('.image-container');
    const hexDisplay = document.getElementById('hexValue');
    const rgbDisplay = document.getElementById('rgbValue');
    const coordsDisplay = document.getElementById('coordsValue');
    const colorSwatch = document.getElementById('colorSwatch');

    if (!modeSwitch || !switchLabel || !imageContainer || !hexDisplay || !rgbDisplay || !coordsDisplay || !colorSwatch) {
        console.error('Initialization failed: Could not find all required UI elements.');
        return;
    }

    // Create a canvas that will be used for interaction and pixel reading
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let canvasReady = false;

    // Create a container for the canvas to help with centering
    const canvasContainer = document.createElement('div');
    canvasContainer.classList.add('canvas-container');
    imageContainer.appendChild(canvasContainer);


    // Create an image element programmatically to set crossOrigin attribute
    const img = new Image();
    img.crossOrigin = "Anonymous"; // This is crucial to prevent canvas tainting

    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvasContainer.appendChild(canvas); // Add canvas to the new container
        canvasReady = true;
        console.log("Canvas is ready with the image.");
    };

    img.onerror = () => {
        console.error("Failed to load image. Check path and permissions.");
    };

    // Set the src AFTER setting onload and crossOrigin
    img.src = 'images/cosmic_tarantula.png';


    const scale = Tonal.Scale.get('C major').notes;
    let oscillator = null;
    let toneMode = 'color'; // 'color' or 'coordinate'

    // --- Audio Context Handling ---
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

    // --- Event Listeners ---
    modeSwitch.addEventListener('change', () => {
        if (modeSwitch.checked) {
            toneMode = 'coordinate';
            switchLabel.textContent = 'Tone by X/Y';
        } else {
            toneMode = 'color';
            switchLabel.textContent = 'Tone by colour';
        }
    });

    canvas.addEventListener('mouseenter', async () => {
        await startAudio();
        if (Tone.context.state !== 'running') return;

        if (!oscillator) {
            oscillator = new Tone.Oscillator({ type: 'sine', frequency: 440 }).toDestination();
            oscillator.start();
        }
    });

    canvas.addEventListener('mousemove', async (e) => {
        if (!canvasReady) return; // Don't do anything if the canvas isn't ready

        if (!oscillator) {
            await startAudio();
            if (Tone.context.state !== 'running') return;
            if (!oscillator) {
                oscillator = new Tone.Oscillator({ type: 'sine', frequency: 440 }).toDestination();
                oscillator.start();
            }
        }

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        // Update Coordinate Display
        coordsDisplay.textContent = `${x}, ${y}`;

        // Get Pixel Data
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        // Update Color Displays
        rgbDisplay.textContent = `(${r}, ${g}, ${b})`;
        const hex = rgbToHex(r, g, b);
        hexDisplay.textContent = hex;
        colorSwatch.style.backgroundColor = hex;

        let freq;

        if (toneMode === 'coordinate') {
            const noteIndex = Math.floor((x / canvas.width) * scale.length);
            const note = scale[noteIndex % scale.length];
            const octave = Math.round(6 - (y / canvas.height) * 4);
            const newNote = `${note}${octave}`;
            freq = Tonal.Note.freq(newNote);
        } else { // 'color' mode
            freq = colorToFrequency(r, g, b);
        }

        if (freq && oscillator) {
            oscillator.frequency.rampTo(freq, 0.05);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (oscillator) {
            oscillator.stop();
            oscillator.dispose();
            oscillator = null;
        }
        // Reset Displays
        hexDisplay.textContent = '#------';
        rgbDisplay.textContent = '(---, ---, ---)';
        coordsDisplay.textContent = '---, ---';
        colorSwatch.style.backgroundColor = '#eee';
    });

    // --- Helper Functions ---
    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("").toUpperCase();
    }

    function colorToFrequency(r, g, b) {
        const brightness = (r + g + b) / 3;
        const minFreq = 100;
        const maxFreq = 1000;
        return (brightness / 255) * (maxFreq - minFreq) + minFreq;
    }
});