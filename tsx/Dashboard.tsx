import { StatsCard } from "@/components/StatsCard";
import { Package, Search, Car, Stethoscope } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your front office operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Inventory Items"
          value={156}
          icon={Package}
          trend="23 low stock"
          colorClass="text-primary"
        />
        <StatsCard
          title="Lost & Found"
          value={12}
          icon={Search}
          trend="3 claimed this week"
          colorClass="text-accent"
        />
        <StatsCard
          title="Taxi Rides Today"
          value={8}
          icon={Car}
          trend="2 pending"
          colorClass="text-info"
        />
        <StatsCard
          title="Doctor Visits"
          value={24}
          icon={Stethoscope}
          trend="This month"
          colorClass="text-success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { action: "Inventory updated", item: "Office supplies", time: "5 min ago" },
              { action: "Lost item reported", item: "Blue umbrella", time: "1 hour ago" },
              { action: "Taxi booked", item: "Airport transfer", time: "2 hours ago" },
              { action: "Doctor visit logged", item: "Dr. Smith", time: "3 hours ago" },
            ].map((activity, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.item}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
              Add Item
            </button>
            <button className="bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
              Report Lost Item
            </button>
            <button className="bg-accent text-accent-foreground py-3 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
              Book Taxi
            </button>
            <button className="bg-muted text-foreground py-3 px-4 rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium">
              Log Visit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
