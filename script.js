document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const imageContainer = document.querySelector('.image-container');
    const loadingText = document.querySelector('.loading-text'); // Moved to top
    const hexDisplay = document.getElementById('hexValue');
    const rgbDisplay = document.getElementById('rgbValue');
    const coordsDisplay = document.getElementById('coordsValue');
    const colorSwatch = document.getElementById('colorSwatch');
    const randomImageBtn = document.getElementById('randomImageBtn');
    const randomToneBtn = document.getElementById('randomToneBtn');
    const btnColorMode = document.getElementById('btnColorMode');
    const btnCoordMode = document.getElementById('btnCoordMode');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toneOverlay = document.getElementById('toneOverlay');
    const visualizerCanvas = document.getElementById('visualizer');
    
    // Settings Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const volSlider = document.getElementById('volSlider');
    const waveSelect = document.getElementById('waveSelect');
    const scaleSelect = document.getElementById('scaleSelect');
    const delaySlider = document.getElementById('delaySlider');
    const reverbSlider = document.getElementById('reverbSlider');

    if (!imageContainer || !hexDisplay || !rgbDisplay || !coordsDisplay || !colorSwatch || !randomImageBtn || !randomToneBtn || !btnColorMode || !btnCoordMode || !loadingOverlay || !toneOverlay || !visualizerCanvas || !settingsBtn || !settingsPanel || !volSlider || !waveSelect || !scaleSelect || !delaySlider || !reverbSlider) {
        console.error('Initialization failed: Could not find all required UI elements.');
        return;
    }

    // --- Audio Effects ---
    const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
    feedbackDelay.wet.value = 0; // Start with no delay

    const reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 0.5
    }).toDestination();
    // Reverb must be generated/initialized
    reverb.generate();

    // --- Loading Text Logic ---
    let loadingInterval;
    const loadingPhrases = [
        "INITIALIZING SEQUENCE...",
        "ANALYZING FREQUENCIES...",
        "DECODING TRANSMISSION...",
        "EXTRACTING HARMONICS...",
        "CALIBRATING SENSORS..."
    ];

    function startLoadingText() {
        let index = 0;
        // Set initial text
        updateText(loadingPhrases[0]);
        
        loadingInterval = setInterval(() => {
            index = (index + 1) % loadingPhrases.length;
            updateText(loadingPhrases[index]);
        }, 800); // Change every 800ms
    }

    function stopLoadingText() {
        clearInterval(loadingInterval);
        updateText("INITIALIZING SEQUENCE..."); // Reset to default
    }

    function updateText(text) {
        if (loadingText) {
            loadingText.textContent = text;
            loadingText.setAttribute('data-text', text); // For the glitch CSS effect
        }
    }

    // --- Random Tone Logic ---
    async function playRandomNote() {
        if (!canvasReady) return;
        await startAudio();

        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);

        let freq;
        if (toneMode === 'coordinate') {
            const noteIndex = Math.floor((x / canvas.width) * currentScale.length);
            const note = currentScale[noteIndex % currentScale.length];
            const octave = Math.round(6 - (y / canvas.height) * 4);
            const newNote = `${note}${octave}`;
            freq = Tonal.Note.freq(newNote);
        } else {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            freq = colorToFrequency(pixel[0], pixel[1], pixel[2]);
        }

        if (freq) {
            const synth = new Tone.MonoSynth({
                oscillator: { type: currentWaveform },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.8 }
            })
            .connect(waveform)
            .connect(feedbackDelay)
            .connect(reverb); 
            
            synth.volume.value = currentVolume;
            synth.triggerAttackRelease(freq, "8n");
            
            // Dispose after playing to avoid memory leak
            setTimeout(() => synth.dispose(), 2000);
        }
    }

    async function playRandomSequence(useOverlay = true) {
        if (useOverlay) toneOverlay.classList.remove('hidden'); // Show overlay to block interaction
         // Play a short sequence
         for (let i = 0; i < 4; i++) {
            playRandomNote();
            await new Promise(r => setTimeout(r, 200));
        }
        if (useOverlay) toneOverlay.classList.add('hidden'); // Hide overlay
    }

    function randomizeSettings() {
        // Randomize Waveform
        const waveforms = ['sine', 'triangle', 'square', 'sawtooth'];
        currentWaveform = waveforms[Math.floor(Math.random() * waveforms.length)];
        waveSelect.value = currentWaveform; // Update UI

        // Randomize Scale
        const scaleOptions = Array.from(scaleSelect.options).map(opt => opt.value);
        const randomScaleName = scaleOptions[Math.floor(Math.random() * scaleOptions.length)];
        scaleSelect.value = randomScaleName; // Update UI
        
        // Update logic for scale
        if (randomScaleName === 'chromatic') {
            currentScale = Tonal.Scale.get('C chromatic').notes;
        } else {
            currentScale = Tonal.Scale.get(randomScaleName).notes;
        }
        
        // Note: Volume is explicitly excluded from randomization
    }

    randomToneBtn.addEventListener('click', () => {
        randomizeSettings();
        playRandomSequence(true);
    });

    // --- Settings Logic ---
    let currentWaveform = 'sine';
    let currentVolume = -10; // dB
    let currentScale = Tonal.Scale.get('C major').notes;

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately if we click the button
        settingsPanel.classList.toggle('hidden');
        settingsBtn.classList.toggle('active');
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.classList.contains('hidden') && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            settingsPanel.classList.add('hidden');
            settingsBtn.classList.remove('active');
        }
    });

    delaySlider.addEventListener('input', (e) => {
        feedbackDelay.wet.value = parseFloat(e.target.value);
    });

    reverbSlider.addEventListener('input', (e) => {
        reverb.decay = parseFloat(e.target.value);
        // Re-generate impulse response when decay changes (needed for Tone.Reverb)
        reverb.generate(); 
    });

    volSlider.addEventListener('input', (e) => {
        currentVolume = parseFloat(e.target.value);
        if (oscillator) {
            oscillator.volume.rampTo(currentVolume, 0.1);
        }
    });

    waveSelect.addEventListener('change', (e) => {
        currentWaveform = e.target.value;
        if (oscillator) {
            oscillator.type = currentWaveform;
        }
    });

    scaleSelect.addEventListener('change', (e) => {
        const scaleName = e.target.value;
        if (scaleName === 'chromatic') {
            currentScale = Tonal.Scale.get('C chromatic').notes;
        } else {
            currentScale = Tonal.Scale.get(scaleName).notes;
        }
    });

    // --- Visualizer Setup ---
    const visCtx = visualizerCanvas.getContext('2d');
    const waveform = new Tone.Waveform(64); // Small buffer for fast drawing
    
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        
        const buffer = waveform.getValue();
        visCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        
        visCtx.beginPath();
        visCtx.lineJoin = 'round';
        visCtx.lineWidth = 2;
        // Use the primary theme color for the visualizer line
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        visCtx.strokeStyle = primaryColor || '#ef4444'; 
        
        if (buffer.length > 0) {
            const sliceWidth = visualizerCanvas.width / buffer.length;
            let x = 0;
            
            for (let i = 0; i < buffer.length; i++) {
                const v = buffer[i]; 
                // Map value (-1 to 1) to canvas height
                const y = (v + 1) / 2 * visualizerCanvas.height;
                
                if (i === 0) {
                    visCtx.moveTo(x, y);
                } else {
                    visCtx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
        }
        
        visCtx.stroke();
    }
    // Start the loop
    drawVisualizer();


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
    const colorThief = new ColorThief();

    img.onload = () => {
        // Draw the image scaled to fit the fixed canvas size
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (!canvasContainer.contains(canvas)) {
            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);
        }
        
        canvasReady = true;
        loadingOverlay.classList.add('hidden'); // Hide loading overlay
        stopLoadingText(); // Stop text cycling
        console.log("Canvas is ready with the image scaled to 2000x1157.");
        
        // Extract dominant color and update button
        try {
            // ColorThief needs the image to be fully loaded and CORS compliant
            if (img.complete) {
                const dominantColor = colorThief.getColor(img);
                console.log("Dominant Color Extracted:", dominantColor);
                const rgbString = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;
                randomImageBtn.style.backgroundColor = rgbString;
                
                // Calculate contrast for text color (simple YIQ)
                const yiq = ((dominantColor[0] * 299) + (dominantColor[1] * 587) + (dominantColor[2] * 114)) / 1000;
                randomImageBtn.style.color = (yiq >= 128) ? '#000' : '#fff';
            } else {
                console.warn("Image not complete for ColorThief");
            }
            
        } catch (e) {
            console.warn("ColorThief failed (likely CORS on first load, or transparent image):", e);
        }
        
        // Play welcome tones (no overlay needed)
        playRandomSequence(false);
    };

    img.onerror = () => {
        console.error("Failed to load image. Check path and permissions.");
        loadingOverlay.classList.add('hidden'); // Hide on error too
        alert("Failed to load image. Please try again.");
    };

    // Initial Image Load
    img.src = 'images/cosmic_tarantula.png';

    // --- Random Image Logic ---
    randomImageBtn.addEventListener('click', () => {
        canvasReady = false;
        loadingOverlay.classList.remove('hidden'); // Show loading overlay
        const randomId = Math.floor(Math.random() * 1000);
        // Request exactly 2000x1157 from Picsum
        img.src = `https://picsum.photos/2000/1157?random=${randomId}`;
    });



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
        playRandomSequence(false);
    });

    btnCoordMode.addEventListener('click', () => {
        toneMode = 'coordinate';
        btnCoordMode.classList.add('active');
        btnColorMode.classList.remove('active');
        playRandomSequence(false);
    });

    canvas.addEventListener('mouseenter', async () => {
        await startAudio();
        if (Tone.context.state !== 'running') return;

        if (!oscillator) {
            oscillator = new Tone.Oscillator({ type: currentWaveform, frequency: 440, volume: currentVolume });
            oscillator.connect(waveform); // Connect to visualizer
            oscillator.connect(feedbackDelay);
            oscillator.connect(reverb);
            oscillator.start();
        }
    });

    canvas.addEventListener('mousemove', async (e) => {
        if (!canvasReady) return; // Don't do anything if the canvas isn't ready

        if (!oscillator) {
            await startAudio();
            if (Tone.context.state !== 'running') return;
            if (!oscillator) {
                oscillator = new Tone.Oscillator({ type: currentWaveform, frequency: 440, volume: currentVolume });
                oscillator.connect(waveform); // Connect to visualizer
                oscillator.connect(feedbackDelay); // Connect to delay
                oscillator.connect(reverb); // Connect to reverb
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
            const noteIndex = Math.floor((x / canvas.width) * currentScale.length);
            const note = currentScale[noteIndex % currentScale.length];
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
        colorSwatch.style.backgroundColor = ''; // Revert to CSS default (var(--muted))
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