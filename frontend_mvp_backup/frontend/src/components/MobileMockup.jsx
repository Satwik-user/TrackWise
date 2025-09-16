import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function MobileMockup() {
  return (
    <div className="w-[300px] mx-auto bg-white rounded-2xl shadow-xl p-4">
      <h2 className="text-lg font-semibold text-center mb-3">Train Status</h2>
      <Card className="border rounded-xl shadow-md">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Train 12345</span>
            <span className="text-green-600 font-semibold">On Time</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>AI Predicted Arrival</span>
            <span>10:45 AM</span>
          </div>
          <div className="flex items-center text-sm text-blue-500 mt-3">
            <Bell className="w-4 h-4 mr-2" />
            <span>No major delays expected.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
