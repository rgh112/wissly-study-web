export function db(env) { if(!env.DB) throw new Error('Study database is unavailable'); return env.DB; }
export async function owned(env,id,owner) { return db(env).prepare('SELECT * FROM study_sessions WHERE id = ? AND owner = ?').bind(id,owner).first(); }
export function record(row) { return { id:row.id, data:JSON.parse(row.data), revision:row.revision, updatedAt:row.updated_at }; }
