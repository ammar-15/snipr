import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import YourSnipes from "./pages/YourSnipes";
import Dashboard from "./pages/Dashboard";
import User from "@/pages/User";
import Auth from "./pages/Auth";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/user" element={<User />} />
        <Route path="*" element={<YourSnipes />} />
      </Route>
    </Routes>
  );
}
