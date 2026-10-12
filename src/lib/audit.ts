import { prisma } from "./db";

export async function audit(params: {
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  diff?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actor: params.actor,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      diff: (params.diff ?? {}) as object,
    },
  });
}
