import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Hourglass } from "lucide-react";
import { Route, Switch, useLocation, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CaseMemory from "./pages/CaseMemory";
import ChronologyTable from "./pages/ChronologyTable";
import NotFound from "./pages/NotFound";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9F9F4' }}>
      {/* Header with Centered Logo */}
      <header style={{ backgroundColor: '#F9F9F4' }}>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Hourglass className="h-10 w-10" strokeWidth={1.5} />
              <div>
                <h1 className="text-4xl font-bold heading tracking-wide">CHRONOS</h1>
                <p className="text-sm text-muted-foreground text-center">Build your case chronology instantly</p>
              </div>
            </div>
            
            {/* Navigation Menu */}
            <div className="flex justify-center gap-12 py-2">
            <Link
              href="/"
              className={`text-base font-medium transition-colors ${
                location === "/"
                  ? "font-bold border-b-2 border-foreground pb-1"
                  : "text-foreground hover:text-[#E07A5F]"
              }`}
            >
              Upload Documents
            </Link>
            <Link
              href="/case-memory"
              className={`text-base font-medium transition-colors ${
                location === "/case-memory"
                  ? "font-bold border-b-2 border-foreground pb-1"
                  : "text-foreground hover:text-[#E07A5F]"
              }`}
            >
              Case Memory
            </Link>
            <Link
              href="/chronology"
              className={`text-base font-medium transition-colors ${
                location === "/chronology"
                  ? "font-bold border-b-2 border-foreground pb-1"
                  : "text-foreground hover:text-[#E07A5F]"
              }`}
            >
              View Chronology
            </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/case-memory" component={CaseMemory} />
          <Route path="/chronology" component={ChronologyTable} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
