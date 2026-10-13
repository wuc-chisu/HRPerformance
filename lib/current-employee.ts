import { auth } from "@/auth";
import { findActiveEmployeeByEmail } from "@/lib/auth-employee";

export async function getAuthenticatedEmployee() {
  const session = await auth();
  const email = session?.user?.email;
  return email ? findActiveEmployeeByEmail(email) : null;
}
