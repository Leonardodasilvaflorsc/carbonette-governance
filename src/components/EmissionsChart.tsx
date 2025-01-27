import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

const data = [
  { name: 'Jan', scope1: 4000, scope2: 2400, scope3: 2400 },
  { name: 'Feb', scope1: 3000, scope2: 1398, scope3: 2210 },
  { name: 'Mar', scope1: 2000, scope2: 9800, scope3: 2290 },
  { name: 'Apr', scope1: 2780, scope2: 3908, scope3: 2000 },
  { name: 'May', scope1: 1890, scope2: 4800, scope3: 2181 },
  { name: 'Jun', scope1: 2390, scope2: 3800, scope3: 2500 },
];

export const EmissionsChart = () => {
  const isMobile = useIsMobile();

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-white p-2 md:p-4 rounded-lg shadow">
      <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Emissions by Scope</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          margin={{
            top: 5,
            right: isMobile ? 10 : 30,
            left: isMobile ? -20 : 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis 
            tick={{ fontSize: isMobile ? 10 : 12 }}
            width={isMobile ? 30 : 40}
          />
          <Tooltip />
          <Legend 
            wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Bar dataKey="scope1" name="Scope 1" fill="#2D5A27" />
          <Bar dataKey="scope2" name="Scope 2" fill="#1B4965" />
          <Bar dataKey="scope3" name="Scope 3" fill="#81C784" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};