import { Route, Routes } from "react-router-dom";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import BatchCheckout from "./pages/BatchCheckout";

function App() {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/brand/:name" element={<Orders />} />

          <Route path="/" element={<NewOrder />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/batches/:id" element={<BatchCheckout />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
