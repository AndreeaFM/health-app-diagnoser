import AuditLog from '../models/AuditLog.js'

/**
 * Log an auditable action. Non-blocking — errors are swallowed.
 * @param {object} actor  - { id, name, role }
 * @param {string} action - one of the AuditLog action enum values
 * @param {object} [target] - { id, name } of the affected user (optional)
 * @param {object} [metadata] - any extra context
 */
export async function audit(actor, action, target = null, metadata = {}) {
  try {
    await AuditLog.create({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      targetId: target?.id || null,
      targetName: target?.name || '',
      metadata,
    })
  } catch (err) {
    console.error('Audit log error:', err.message)
  }
}
