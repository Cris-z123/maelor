import { describe, expect, it } from 'vitest';

import { getAllChannels, IPC_CHANNELS, isValidChannel } from '@/ipc/channels';

describe('ipc channels', () => {
  it('returns every active channel and validates known names', () => {
    const channels = getAllChannels();

    expect(channels).toEqual(Object.values(IPC_CHANNELS));
    expect(isValidChannel(IPC_CHANNELS.RUNS_START)).toBe(true);
    expect(isValidChannel('unknown:channel')).toBe(false);
  });
});
