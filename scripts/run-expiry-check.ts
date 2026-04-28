import { runDailyExpiryCheck } from "../lib/expiry";

async function main() {
  const result = await runDailyExpiryCheck();
  console.log(
    JSON.stringify(
      {
        processed: result.processedCount,
        requiresAttention: result.requiresAttentionCount,
        summary: result.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
