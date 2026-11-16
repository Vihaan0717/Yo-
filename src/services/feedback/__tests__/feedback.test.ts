import { describe, it, expect } from 'vitest';
import { HapticsService } from '../HapticsService';
import { SoundEffectsService } from '../SoundEffectsService';

describe('Audio-Haptic & iOS Experience Engine', () => {
  it('should trigger haptic methods safely across platforms without error', async () => {
    await expect(HapticsService.light()).resolves.not.toThrow();
    await expect(HapticsService.medium()).resolves.not.toThrow();
    await expect(HapticsService.heavy()).resolves.not.toThrow();
    await expect(HapticsService.selection()).resolves.not.toThrow();
    await expect(HapticsService.success()).resolves.not.toThrow();
  });

  it('should play send, receive and tap sound effects without throwing exceptions', () => {
    expect(() => SoundEffectsService.playMessageSent()).not.toThrow();
    expect(() => SoundEffectsService.playMessageReceived()).not.toThrow();
    expect(() => SoundEffectsService.playTap()).not.toThrow();
  });
});
