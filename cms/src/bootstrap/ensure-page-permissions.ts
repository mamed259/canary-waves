type StrapiInstance = {
  query: (uid: string) => {
    findOne: (params: Record<string, unknown>) => Promise<{ id: number } | null>;
  };
  db: {
    query: (uid: string) => {
      findOne: (params: Record<string, unknown>) => Promise<{ id: number } | null>;
      create: (params: Record<string, unknown>) => Promise<unknown>;
    };
  };
};

const PAGE_ACTIONS = ["api::page.page.find", "api::page.page.findOne"] as const;

export async function ensurePagePermissions(strapi: StrapiInstance) {
  const publicRole = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "public" },
  });

  if (!publicRole) {
    return;
  }

  for (const action of PAGE_ACTIONS) {
    const existingPermission = await strapi.db.query("plugin::users-permissions.permission").findOne({
      where: {
        action,
        role: publicRole.id,
      },
    });

    if (existingPermission) {
      continue;
    }

    await strapi.db.query("plugin::users-permissions.permission").create({
      data: {
        action,
        role: publicRole.id,
      },
    });
  }
}
