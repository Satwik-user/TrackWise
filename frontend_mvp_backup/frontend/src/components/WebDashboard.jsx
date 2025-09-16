import { Card, CardContent } from "@/components/ui/card";
import { Map, TrendingUp, Timer, Leaf } from "lucide-react";

export default function WebDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6 p-6 bg-gray-50 rounded-2xl shadow-lg">
      {/* Map Section */}
      <div className="col-span-2 bg-white rounded-xl shadow-md p-4">
        <h2 className="text-lg font-semibold flex items-center mb-3">
          <Map className="w-5 h-5 mr-2" /> AI Traffic Map
        </h2>
        <div className="h-64 bg-gradient-to-br from-red-200 via-yellow-100 to-green-200 rounded-xl flex items-center justify-center">
          <span className="text-gray-600 text-sm">[Heatmap Preview]</span>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Throughput</p>
              <p className="text-lg font-bold">+25%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Timer className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Delays Reduced</p>
              <p className="text-lg font-bold">-50%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Leaf className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Energy Savings</p>
              <p className="text-lg font-bold">15%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
