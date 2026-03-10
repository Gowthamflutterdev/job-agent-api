// In-memory session store (use Redis for production)
const sessions = {};

export function getContext(sessionId) {
  return sessions[sessionId] || { role: null, location: null, history: [] };
}

export function updateContext(sessionId, updates) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { role: null, location: null, history: [] };
  }

  // Merge extracted fields (role, location) into session
  if (updates.role)     sessions[sessionId].role     = updates.role;
  if (updates.location) sessions[sessionId].location = updates.location;

  // Append chat turn
  if (updates.turn) {
    sessions[sessionId].history.push(updates.turn);
    // Keep last 20 turns
    if (sessions[sessionId].history.length > 20) {
      sessions[sessionId].history = sessions[sessionId].history.slice(-20);
    }
  }
}

export function clearContext(sessionId) {
  delete sessions[sessionId];
}
