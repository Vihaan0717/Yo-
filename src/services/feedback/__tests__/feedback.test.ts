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

  it('should play all UI & feedback sound effects without throwing exceptions', () => {
    expect(() => SoundEffectsService.playMessageSent()).not.toThrow();
    expect(() => SoundEffectsService.playMessageReceived()).not.toThrow();
    expect(() => SoundEffectsService.playTap()).not.toThrow();
    expect(() => SoundEffectsService.playTabSwitch()).not.toThrow();
    expect(() => SoundEffectsService.playChipSelect()).not.toThrow();
    expect(() => SoundEffectsService.playToggleOn()).not.toThrow();
    expect(() => SoundEffectsService.playToggleOff()).not.toThrow();
    expect(() => SoundEffectsService.playDrawerOpen()).not.toThrow();
    expect(() => SoundEffectsService.playDrawerClose()).not.toThrow();
    expect(() => SoundEffectsService.playRecordStart()).not.toThrow();
    expect(() => SoundEffectsService.playRecordStop()).not.toThrow();
    expect(() => SoundEffectsService.playFavorite()).not.toThrow();
    expect(() => SoundEffectsService.playDelete()).not.toThrow();
  });
});
