"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const activityData = [
  { day: "01 set", requests: 86 }, { day: "03 set", requests: 112 }, { day: "05 set", requests: 94 },
  { day: "07 set", requests: 148 }, { day: "09 set", requests: 121 }, { day: "11 set", requests: 176 },
  { day: "13 set", requests: 142 }, { day: "15 set", requests: 208 }, { day: "17 set", requests: 164 },
  { day: "19 set", requests: 191 }, { day: "21 set", requests: 151 }, { day: "23 set", requests: 226 },
  { day: "25 set", requests: 184 }, { day: "27 set", requests: 248 },
];

type ChartProps = { compact?: boolean };

export function ActivityChart({ compact = false }: ChartProps) {
  return <div className={compact ? "h-[205px] w-full" : "h-[240px] w-full"}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={activityData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs><linearGradient id="requestsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#52524d" stopOpacity={0.16}/><stop offset="100%" stopColor="#52524d" stopOpacity={0.01}/></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#ecece9" strokeDasharray="3 3"/>
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#858580", fontSize: 10 }} interval={compact ? 3 : 1}/>
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#858580", fontSize: 10 }} tickFormatter={(value: number) => `${value}k`} width={36}/>
        <Tooltip contentStyle={{ border: "1px solid #e7e7e4", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }} formatter={(value) => [`${value} mil`, "Requisições"]}/>
        <Area type="monotone" dataKey="requests" stroke="#333330" strokeWidth={2} fill="url(#requestsFill)" activeDot={{ r: 4, fill: "#333330", stroke: "white", strokeWidth: 2 }}/>
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
