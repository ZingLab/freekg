/**
 * Main Application
 * Coordinates between audio processor and UI controller
 */

// Initialize modules
const audioProcessor = new AudioProcessor();
const uiController = new UIController();

// Button references
const requestMicBtn = document.getElementById('requestMicBtn');
const startRecordingBtn = document.getElementById('startRecordingBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');

/**
 * Step 1: Request microphone access
 */
requestMicBtn.addEventListener('click', async () => {
    requestMicBtn.disabled = true;
    uiController.updateStatus('micStatus', 'Requesting access...');

    const result = await audioProcessor.requestMicrophone();

    if (result.success) {
        uiController.updateStatus('micStatus', '✓ Microphone access granted');
        
        // Wait a moment then move to step 2
        setTimeout(() => {
            uiController.goToStep(2);
        }, 1000);
    } else {
        uiController.updateStatus('micStatus', `✗ Access denied: ${result.error}`, true);
        requestMicBtn.disabled = false;
        
        uiController.showError(
            'Microphone access is required for this app to work. ' +
            'Please grant permission and try again.'
        );
    }
});

/**
 * Step 2: Start recording
 */
startRecordingBtn.addEventListener('click', async () => {
    startRecordingBtn.disabled = true;
    uiController.goToStep(3);
    
    const recordingDuration = 15; // seconds
    
    // Animate progress bar
    uiController.animateProgress(recordingDuration);

    try {
        // Start recording
        const recordedData = await audioProcessor.startRecording(recordingDuration);
        
        // Process the recorded audio
        const result = audioProcessor.detectHeartRate(recordedData);
        
        // Display results
        uiController.displayResults(result.bpm, result.waveform);
        
    } catch (error) {
        console.error('Recording error:', error);
        uiController.showError('An error occurred during recording. Please try again.');
        uiController.reset();
        startRecordingBtn.disabled = false;
    }
});

/**
 * Try again - reset the application
 */
tryAgainBtn.addEventListener('click', () => {
    // Clean up audio resources
    audioProcessor.cleanup();
    
    // Reset UI
    uiController.reset();
    
    // Re-enable buttons
    requestMicBtn.disabled = false;
    startRecordingBtn.disabled = false;
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    audioProcessor.cleanup();
});

/**
 * Handle visibility change (e.g., user switches tabs)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden && audioProcessor.isRecording) {
        console.log('Page hidden during recording - continuing...');
    }
});
