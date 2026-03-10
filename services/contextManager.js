// In-memory session store (replace with Redis for production)
const sessions = {};

export function getContext(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      role:       null,
      location:   null,
      experience: null,
      history:    [],
    };
  }
  return sessions[sessionId];
}

export function updateContext(sessionId, updates) {
  const session = getContext(sessionId);

  // ── CRITICAL FIX: Only overwrite if NEW value exists ──────────
  // Never wipe out role/location with null from a follow-up message
  // "2 yr experience" should NOT clear role="Flutter Developer"
  if (updates.role     !== null && updates.role     !== undefined) session.role     = updates.role;
  if (updates.location !== null && updates.location !== undefined) session.location = updates.location;
  if (updates.experience !== null && updates.experience !== undefined) session.experience = updates.experience;

  // Append chat turn to history
  if (updates.turn) {
    session.history.push(updates.turn);
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
  }
}

export function clearContext(sessionId) {
  delete sessions[sessionId];
}