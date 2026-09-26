/**
 * Grants a staff role to an existing Firebase Auth user (create the user in the
 * Firebase console first). Bootstraps the first owner.
 *
 *   npm run admin:grant -- --email you@example.com --role owner
 *   npm run admin:grant -- --email you@example.com --revoke
 */
import { FieldValue } from "firebase-admin/firestore";
import { ROLES, type Role } from "../src/lib/models";
import { arg, flag, initAdmin } from "./_admin";

const { db, auth, businessId } = initAdmin();

async function main() {
  const email = arg("email");
  if (!email) throw new Error("--email is required");
  const user = await auth.getUserByEmail(email);

  if (flag("revoke")) {
    await auth.setCustomUserClaims(user.uid, {});
    await auth.revokeRefreshTokens(user.uid);
    await db.collection("admins").doc(user.uid).set({ active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`Revoked staff access and sessions for ${email}.`);
    return;
  }
  const role = arg("role") as Role | undefined;
  if (!role || !ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
  await auth.setCustomUserClaims(user.uid, { role, businessId });
  await db.collection("admins").doc(user.uid).set(
    { uid: user.uid, email, displayName: user.displayName ?? null, role, active: true, businessId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log(`Granted "${role}" to ${email}. They must sign in again for the claim to apply.`);
}
main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
