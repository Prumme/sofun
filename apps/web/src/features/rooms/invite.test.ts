import { describe, expect, it } from 'vitest';
import { buildInviteUrl, readInviteCode } from './invite';

describe('room admission links', () => {
  it('keeps the actual LAN origin and port, and shares only the public room code', () => {
    expect(buildInviteUrl('http://192.168.1.12:5174', 'ABC234')).toBe('http://192.168.1.12:5174/join?code=ABC234');
    expect(buildInviteUrl('http://[fd00::12]:3000', 'ABC234')).toBe('http://[fd00::12]:3000/join?code=ABC234');
    expect(buildInviteUrl('https://party.local:4443/other?token=secret#private', 'ABC234')).toBe('https://party.local:4443/join?code=ABC234');
  });
  it('opens the player form without requiring a room code or sharing other data', () => {
    expect(buildInviteUrl('http://192.168.1.12:5174/private?token=secret#hidden')).toBe('http://192.168.1.12:5174/join');
  });
  it('does not invite phones to loopback or wildcard addresses', () => {
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.2.3.4:3000', 'http://[::1]:3000', 'http://0.0.0.0:3000', 'http://[::]:3000', 'http://room.localhost:3000', 'ftp://192.168.1.12']) expect(buildInviteUrl(origin, 'ABC234')).toBeNull();
  });
  it('normalizes a valid code, without trusting malformed or ambiguous query parameters', () => {
    expect(readInviteCode('?code=abc234')).toEqual({ code: 'ABC234', invalid: false });
    expect(readInviteCode('?code=%20abc234%20')).toEqual({ code: 'ABC234', invalid: false });
    expect(readInviteCode('')).toEqual({ code: '', invalid: false });
    for (const search of ['?code=', '?code=AB1', '?code=ABC2345', '?code=%3Cscript%3E', '?code=ABC234&code=DEF234']) expect(readInviteCode(search)).toEqual({ code: '', invalid: true });
  });
});
