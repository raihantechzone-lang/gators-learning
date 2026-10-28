import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROL_IDLE_MS, VIDEO_SPEEDS, videoControlOptions } from './video-controls.js';

describe('Lesson playback rules', () => {
  it('hides idle playback controls after exactly three seconds', () => {
    assert.equal(CONTROL_IDLE_MS, 3000);
  });
  it('skips ten seconds forward or backward', () => {
    assert.equal(videoControlOptions().seekTime, 10);
  });
  it('limits playback speed to 0.75x through 2x', () => {
    assert.deepEqual(VIDEO_SPEEDS, [0.75, 1, 1.25, 1.5, 1.75, 2]);
    assert.deepEqual(videoControlOptions().speed.options, VIDEO_SPEEDS);
    assert.equal(videoControlOptions().speed.selected, 1);
  });
});