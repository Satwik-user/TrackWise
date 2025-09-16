import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginMockup() {
  return (
    <div className="flex justify-center items-center h-[500px] bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-lg">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[320px]">
        <h2 className="text-xl font-bold text-center text-blue-700 mb-6">
          Railway Control Login
        </h2>
        <div className="space-y-4">
          <Input placeholder="Email" className="rounded-xl" />
          <Input type="password" placeholder="Password" className="rounded-xl" />
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            Sign In
          </Button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          Powered by AI-Powered Traffic Control
        </p>
      </div>
    </div>
  );
}
