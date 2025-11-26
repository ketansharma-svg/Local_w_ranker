import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface CustomPieChartProps {
  totalUrls: number;
  successfulChecks: number;
  failedChecks: number;
}
const CustomPieChart: React.FC<CustomPieChartProps> = ({ totalUrls, successfulChecks, failedChecks }) => {
  const data = [
    { name: "Successful Checks", value: successfulChecks },
    { name: "Failed Checks", value: failedChecks },
  ];
  const COLORS = ["#4CAF50", "#F44336"]; // Green for successful checks, red for failed checks
  return (
    <PieChart width={300} height={300}>
      <Pie
        data={data}
        cx={150} // Center x
        cy={150} // Center y
        innerRadius={40} // Inner radius for a donut effect
        outerRadius={80} // Outer radius
        fill="#8884d8"
        dataKey="value"
        label>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
};

export default CustomPieChart;