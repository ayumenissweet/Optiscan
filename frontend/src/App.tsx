import { Route, Routes } from "react-router-dom";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import BatchCheckout from "./pages/BatchCheckout";

function App() {
  return (
    <div className="flex min-h-screen">
      <Navbar></Navbar>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Orders brand="Soleko" />}></Route>
          <Route path="/cornelia" element={<Orders brand="Cornelia" />}></Route>
          <Route
            path="/versa-view"
            element={<Orders brand="Versa View" />}
          ></Route>

          <Route path="/new" element={<NewOrder />}></Route>
          <Route path="/settings" element={<Settings />}></Route>
          <Route path="/batches/:id" element={<BatchCheckout />}></Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
