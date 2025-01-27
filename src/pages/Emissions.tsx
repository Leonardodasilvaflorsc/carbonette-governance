import { DashboardLayout } from "@/components/DashboardLayout";
import { EmissionsHeader } from "@/components/EmissionsHeader";
import { EmissionsSummary } from "@/components/EmissionsSummary";
import { EmissionsChart } from "@/components/EmissionsChart";
import { EmissionsTable } from "@/components/EmissionsTable";
import { EmissionsActions } from "@/components/EmissionsActions";
import { EmissionsInsights } from "@/components/EmissionsInsights";

const Emissions = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <EmissionsHeader />
        <EmissionsSummary />
        <EmissionsChart />
        <EmissionsActions />
        <EmissionsTable />
        <EmissionsInsights />
      </div>
    </DashboardLayout>
  );
};

export default Emissions;