// This file defines our "mutators".
//
// Mutators are how you change data in Reflect apps.
//
// They are registered with Reflect at construction-time and callable like:
// `myReflect.mutate.setCursor()`.
//
// Reflect runs each mutation immediately (optimistically) on the client,
// against the local cache, and then later (usually moments later) sends a
// description of the mutation (its name and arguments) to the server, so that
// the server can *re-run* the mutation there against the authoritative
// datastore.
//
// This re-running of mutations is how Reflect handles conflicts: the
// mutators defensively check the database when they run and do the appropriate
// thing. The Reflect sync protocol ensures that the server-side result takes
// precedence over the client-side optimistic result.

import type { WriteTransaction } from "@rocicorp/reflect";
import { initClientState, updateClientState } from "./client-state.js";

export const mutators = {
  setCursor,
  initClientState,
  increment,
};

export type M = typeof mutators;

type GameState = {
  count: number;
};

type AuthData = {
  userID: string;
  roomID: string;
};

// It is possible for the js global scope to be reused for multiple rooms
// within one Reflect customer org, so we scope the game state to roomID.
// roomID -> GameState
const serverData: Map<string, GameState> = new Map();

async function increment(tx: WriteTransaction) {
  if (tx.location !== "server") {
    return;
  }
  console.log(`incrementing`);

  const userData = tx.auth as AuthData;
  let gameState = serverData.get(userData.roomID);
  if (!gameState) {
    gameState = { count: 0 };
    serverData.set(userData.roomID, gameState);
  }
  gameState.count++;

  if (gameState.count % 2 === 0) {
    tx.set("evenCount", gameState.count);
  }
}

async function setCursor(
  tx: WriteTransaction,
  { x, y }: { x: number; y: number }
): Promise<void> {
  await updateClientState(tx, { id: tx.clientID, cursor: { x, y } });
}
