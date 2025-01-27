import { DashboardLayout } from "@/components/DashboardLayout";
import { EmissionsChart } from "@/components/EmissionsChart";
import { StatsCard } from "@/components/StatsCard";
import { ArrowDown, ArrowUp, Target, Leaf } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome to your carbon emissions dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Emissions"
            value="2,345"
            description="tCO₂e this month"
            icon={<ArrowUp className="h-4 w-4 text-red-500" />}
          />
          <StatsCard
            title="Reduction Target"
            value="15%"
            description="by 2025"
            icon={<Target className="h-4 w-4 text-primary" />}
          />
          <StatsCard
            title="Carbon Offset"
            value="450"
            description="tCO₂e offset this year"
            icon={<Leaf className="h-4 w-4 text-green-500" />}
          />
          <StatsCard
            title="YoY Change"
            value="-12%"
            description="compared to last year"
            icon={<ArrowDown className="h-4 w-4 text-green-500" />}
          />
        </div>

        <EmissionsChart />
      </div>
    </DashboardLayout>
  );
};

export default Index;