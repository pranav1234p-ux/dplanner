// Generate the MASTER_ADMIN_PASSWORD_HASH value for the break-glass master admin.
//
// Usage (from the drone-command-center folder):
//   node scripts/hash-master-password.mjs "YourChosenPassword"
//
// Paste the printed value into MASTER_ADMIN_PASSWORD_HASH in .env (never commit
// .env). The plaintext password is never written anywhere.
//
// The output is a bcrypt hash, base64-encoded. The base64 wrapper matters:
// a raw bcrypt hash contains '$' characters, which the dotenv loader treats as
// variable references and mangles. base64 avoids that entirely.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-master-password.mjs "YourChosenPassword"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(Buffer.from(hash, "utf8").toString("base64"));
