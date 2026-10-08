import { BrowserRouter } from "react-router-dom";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";
import RouteFocus from "./components/RouteFocus";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <div className="app-shell">
              <a href="#main" className="skip-link">
                Hoppa till innehåll
              </a>
              <Navbar />
              <RouteFocus />
              <main className="app-main" id="main" tabIndex={-1}>
                <AppRoutes />
              </main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </BrowserRouter>
  );
}

export default App;
