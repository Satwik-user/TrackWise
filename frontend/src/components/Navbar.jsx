import { Train, User } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center bg-white shadow-md px-6 py-3 rounded-2xl mb-6">
      <div className="flex items-center space-x-2">
        <Train className="w-6 h-6 text-blue-600" />
        <h1 className="text-lg font-bold text-blue-700">RailOpt AI</h1>
      </div>
      <div className="flex items-center space-x-3 text-gray-600">
        <a href="#" className="hover:text-blue-600">Dashboard</a>
        <a href="#" className="hover:text-blue-600">Reports</a>
        <User className="w-6 h-6 hover:text-blue-600 cursor-pointer" />
      </div>
    </nav>
  );
}
