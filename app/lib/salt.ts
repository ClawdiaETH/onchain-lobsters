// lib/salt.ts
// Salt lifecycle: generate → persist → retrieve → clear
// localStorage keyed to wallet address → survives page refresh

import { keccak256, encodePacked } from "viem";

import { CONTRACT_ADDRESS } from "@/constants";

// Key includes contract address so redeploys auto-invalidate stale commits.
const STORAGE_KEY = (addr: string) =>
  `lobster_commit_${CONTRACT_ADDRESS.toLowerCase()}_${addr.toLowerCase()}`;

export interface PendingCommit {
  salt: `0x${string}`;
  commitBlock: number;
  commitment: `0x${string}`;
  txHash: `0x${string}`;
}

export function generateSalt(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return ("0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

export function computeCommitment(salt: `0x${string}`, address: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(["bytes32", "address"], [salt, address]));
}

export function savePendingCommit(address: string, data: PendingCommit) {
  try {
    localStorage.setItem(STORAGE_KEY(address), JSON.stringify(data));
  } catch (e) {
    console.error("Failed to persist commit — DO NOT SUBMIT COMMIT TX", e);
    throw e; // never burn without persisting salt
  }
}

export function loadPendingCommit(address: string): PendingCommit | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(address));
    return raw ? (JSON.parse(raw) as PendingCommit) : null;
  } catch {
    return null;
  }
}

export function clearPendingCommit(address: string) {
  try { localStorage.removeItem(STORAGE_KEY(address)); } catch {}
}
