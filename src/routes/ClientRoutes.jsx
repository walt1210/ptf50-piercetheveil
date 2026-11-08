import { Navigate, Route, Routes } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import Home from "../pages/client/Home";
import AIRecommendation from "../pages/client/AIRecommendation";
import Appointment from "../pages/client/Appointment";
import BookingLookup from "../pages/client/BookingLookup";

// Public site. No customer accounts: everything here works without signing in.
export default function ClientRoutes() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route index element={<Home />} />
        <Route path="recommend" element={<AIRecommendation />} />
        <Route path="availability" element={<Appointment />} />
        <Route path="booking" element={<BookingLookup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
