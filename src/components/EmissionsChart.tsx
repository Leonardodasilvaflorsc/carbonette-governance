import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', scope1: 4000, scope2: 2400, scope3: 2400 },
  { name: 'Feb', scope1: 3000, scope2: 1398, scope3: 2210 },
  { name: 'Mar', scope1: 2000, scope2: 9800, scope3: 2290 },
  { name: 'Apr', scope1: 2780, scope2: 3908, scope3: 2000 },
  { name: 'May', scope1: 1890, scope2: 4800, scope3: 2181 },
  { name: 'Jun', scope1: 2390, scope2: 3800, scope3: 2500 },
];

export const EmissionsChart = () => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Emissions by Scope</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="scope1" name="Scope 1" fill="#2D5A27" />
          <Bar dataKey="scope2" name="Scope 2" fill="#1B4965" />
          <Bar dataKey="scope3" name="Scope 3" fill="#81C784" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};