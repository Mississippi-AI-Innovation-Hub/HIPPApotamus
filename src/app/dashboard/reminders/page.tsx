import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs } from "@/lib/db";
import ReminderScheduler from "@/components/dashboard/ReminderScheduler";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reminders | HIPAApotamus",
  description: "Track and manage contract expiration reminders",
};

export default async function RemindersPage() {
  const session = await getRequiredSession();

  const [vendors, baas] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          Reminders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage contract expiration reminders
        </p>
      </div>

      <ReminderScheduler baas={baas} vendors={vendors} />
    </div>
  );
}
