/**
 * Audio conversion utilities for Sarvam AI compatibility
 * Converts WebM audio to WAV format required by Sarvam AI STT
 */

export class AudioConverter {
  /**
   * Convert WebM audio blob to WAV format
   * @param webmBlob - Input WebM audio blob
   * @returns Promise<Blob> - Output WAV audio blob
   */
  static async webmToWav(webmBlob: Blob): Promise<Blob> {
    try {
      // Create audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Sarvam AI prefers 16kHz
      });
      
      // Convert blob to array buffer
      const arrayBuffer = await webmBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBlob = this.audioBufferToWav(audioBuffer);
      
      // Close audio context to free resources
      await audioContext.close();
      
      return wavBlob;
    } catch (error) {
      console.error('Audio conversion failed:', error);
      // Return original blob if conversion fails
      return webmBlob;
    }
  }

  /**
   * Convert AudioBuffer to WAV Blob
   * @param audioBuffer - Input AudioBuffer
   * @returns Blob - Output WAV blob
   */
  private static audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = 1; // Force mono for Sarvam AI compatibility
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM format
    const bitDepth = 16;
    
    // Get channel data (use first channel or mix down to mono)
    let channelData: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Mix down multiple channels to mono
      channelData = new Float32Array(audioBuffer.length);
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channel = audioBuffer.getChannelData(i);
        for (let j = 0; j < channel.length; j++) {
          channelData[j] += channel[j] / audioBuffer.numberOfChannels;
        }
      }
    }
    
    // Convert float samples to 16-bit PCM
    const pcmData = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    // Create WAV file header
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Format chunk size
    view.setUint16(20, format, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true); // Byte rate
    view.setUint16(32, numChannels * bitDepth / 8, true); // Block align
    view.setUint16(34, bitDepth, true); // Bits per sample
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true); // Data chunk size
    
    // Write PCM data
    const pcmView = new Int16Array(buffer, 44);
    pcmView.set(pcmData);
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write string to DataView
   * @param view - DataView to write to
   * @param offset - Byte offset
   * @param string - String to write
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Check if audio conversion is supported in current browser
   * @returns boolean - True if supported
   */
  static isConversionSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Get optimal recording configuration for Sarvam AI
   * @returns MediaRecorderOptions
   */
  static getOptimalRecordingConfig(): MediaRecorderOptions {
    // Try to find the best supported format
    const preferredTypes = [
      'audio/wav',
      'audio/webm;codecs=pcm',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg'
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return {
          mimeType: type,
          audioBitsPerSecond: 64000 // Conservative bitrate for better compatibility
        };
      }
    }

    // Fallback to default
    return {
      audioBitsPerSecond: 64000
    };
  }
} 