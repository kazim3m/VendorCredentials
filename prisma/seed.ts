import { UserRole } from "@prisma/client";
import { prisma } from "../lib/db";

const DEFAULT_ADMIN_EMAIL = "kazim.naim@3monkeys.net";

async function main() {
  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: { role: UserRole.ADMIN, enabled: true },
    create: { email: DEFAULT_ADMIN_EMAIL, role: UserRole.ADMIN, enabled: true }
  });

  console.log(`Seed completed. Admin ensured: ${DEFAULT_ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
