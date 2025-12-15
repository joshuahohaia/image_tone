# Image Tone Player

A simple, interactive web experiment that generates musical tones based on your cursor's position over an image.

**[Live Demo](https://image-tone.vercel.app/)**

---

## Description

This application maps the pixels of an image to a musical soundscape. As you move your mouse across the image, the application generates real-time audio feedback, with the horizontal axis controlling the musical note and the vertical axis controlling the octave.

The goal is to create a synesthetic experience, connecting a visual medium (the image) with an auditory one (the music).

## How It Works

The project is built with plain HTML, CSS, and JavaScript, using two key libraries for the audio component:

*   **[Tone.js](https://tonejs.github.io/)**: A powerful framework for creating interactive music in the browser. It is used here to generate the actual oscillator sounds.
*   **[Tonal.js](https://github.com/tonaljs/tonal)**: A compact library for music theory, used to calculate note frequencies and scales.

When a user hovers over the image, their cursor's X and Y coordinates are captured. These coordinates are then mapped to a specific note within a pre-defined musical scale (C Major) and a specific octave, which is then played through a `Tone.Oscillator`.

## Planned Future Features

This is an experimental project with many possibilities for expansion.

#### Core Feature Ideas:
*   **Customizable Sound**: Allow users to change the oscillator type (e.g., `sine`, `square`, `triangle`, `sawtooth`) to customize the tone's timbre.
*   **Scale & Key Selection**: Implement a UI to select different musical scales and keys (e.g., Minor, Pentatonic, Blues).
*   **Image Gallery**: Create a gallery of different images, allowing the user to switch between them for varied visual and auditory experiences.
*   **User Image Uploads**: Allow users to upload their own images to generate a soundscape from.

#### Advanced Feature Ideas:
*   **Visual Feedback**: Draw a visual effect (like a glowing dot or ripple) on the image at the cursor's position to give clearer feedback on the currently playing note.
*   **"Drag and Drop" Sound Packs**: Allow users to drag different synthesizer presets or sound configurations onto the image to instantly change the entire sound palette.
*   **Mobile/Touch Support**: Add support for touch events so the experience works seamlessly on mobile devices.
*   **Save & Share**: Generate a unique URL for a specific image/sound/scale combination so users can share their creations.
