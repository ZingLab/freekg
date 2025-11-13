# FreeKG - Fun Heart Rate Monitor

A web-based experimental heart rate detector that uses your phone's microphone to detect pulse vibrations from your neck.

**⚠️ DISCLAIMER: This is for entertainment purposes only and is NOT a medical device.**

## Features

- Clean, modular code architecture
- Microphone permission handling
- 15-second audio recording
- Bandpass filtering (0.8-3 Hz for heart rate detection)
- Real-time waveform visualization
- Heart rate calculation (BPM)

## Setup

1. Upload all files to your web server:
   - `index.html`
   - `styles.css`
   - `audio-processor.js`
   - `ui-controller.js`
   - `app.js`

2. Add your positioning guide image as `position-guide.png` (optional)
   - Shows proper phone placement against neck
   - If not provided, a simple emoji placeholder will display

3. Ensure your server uses HTTPS (required for microphone access)

## File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── audio-processor.js  # Audio capture and signal processing
├── ui-controller.js    # Interface management and visualization
├── app.js             # Main application coordinator
└── position-guide.png  # User positioning guide (to be added)
```

## Module Breakdown

### audio-processor.js
- Microphone access and permissions
- Audio recording and buffering
- Bandpass filtering (heart rate frequency isolation)
- Peak detection algorithm
- BPM calculation

### ui-controller.js
- Step navigation
- Progress bar animation
- Waveform canvas rendering
- Result display
- Audio beep notification

### app.js
- Event handlers for user interactions
- Coordination between audio processor and UI
- Application lifecycle management

## How It Works

1. **Microphone Access**: Requests permission to use device microphone
2. **Audio Capture**: Records 15 seconds of audio data from neck vibrations
3. **Signal Processing**: 
   - Normalizes audio data
   - Applies moving average smoothing
   - Filters to isolate 0.8-3 Hz (48-180 BPM)
4. **Peak Detection**: Identifies rhythmic peaks in the filtered signal
5. **BPM Calculation**: Analyzes peak intervals to determine heart rate
6. **Visualization**: Displays waveform and calculated BPM

## Browser Compatibility

- Chrome/Edge: Full support
- Safari: Full support (iOS requires user interaction before microphone access)
- Firefox: Full support

**Note**: HTTPS is required for microphone access in all browsers.

## Technical Notes

- Sample rate: Uses device's native audio sample rate (typically 44.1 kHz)
- Recording duration: 15 seconds
- BPM range: 40-200 (validated)
- Signal processing: Time-domain analysis with peak detection

## Limitations

- Not a medical device
- Accuracy depends on proper positioning
- Background noise can affect results
- Works best in quiet environments
- Requires steady hand during recording

## Privacy

- All processing happens locally in the browser
- No audio data is transmitted or stored
- Microphone access is used only during active recording

## Future Enhancements

- Multiple measurement averaging
- Confidence score display
- Export results feature
- Historical tracking (local storage)
- Improved filtering algorithms

---

Made with curiosity | Not for medical use
