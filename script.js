document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.querySelector('.image-container');
    const hexDisplay = document.getElementById('hexValue');
    const rgbDisplay = document.getElementById('rgbValue');
    const coordsDisplay = document.getElementById('coordsValue');
    const colorSwatch = document.getElementById('colorSwatch');
    const randomImageBtn = document.getElementById('randomImageBtn');
    const btnColorMode = document.getElementById('btnColorMode');
    const btnCoordMode = document.getElementById('btnCoordMode');

    if (!imageContainer || !hexDisplay || !rgbDisplay || !coordsDisplay || !colorSwatch || !randomImageBtn || !btnColorMode || !btnCoordMode) {
        console.error('Initialization failed: Could not find all required UI elements.');
        return;
    }

    // Create a canvas that will be used for interaction and pixel reading
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1157;
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
        // Draw the image scaled to fit the fixed canvas size
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (!canvasContainer.contains(canvas)) {
            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);
        }
        
        canvasReady = true;
        console.log("Canvas is ready with the image scaled to 2000x1157.");
    };

    img.onerror = () => {
        console.error("Failed to load image. Check path and permissions.");
    };

    // Initial Image Load
    img.src = 'images/cosmic_tarantula.png';

    // --- Random Image Logic ---
    randomImageBtn.addEventListener('click', () => {
        canvasReady = false;
        const randomId = Math.floor(Math.random() * 1000);
        // Request exactly 2000x1157 from Picsum
        img.src = `https://picsum.photos/2000/1157?random=${randomId}`;
    });



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
    btnColorMode.addEventListener('click', () => {
        toneMode = 'color';
        btnColorMode.classList.add('active');
        btnCoordMode.classList.remove('active');
    });

    btnCoordMode.addEventListener('click', () => {
        toneMode = 'coordinate';
        btnCoordMode.classList.add('active');
        btnColorMode.classList.remove('active');
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