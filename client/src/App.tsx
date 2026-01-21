import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Hourglass } from "lucide-react";
import { Route, Switch, useLocation, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ChronologyTable from "./pages/ChronologyTable";
import NotFound from "./pages/NotFound";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Logo */}
      <header className="border-b border-foreground/20 bg-card">
        <div className="container mx-auto py-6">
          <div className="flex items-center gap-3">
            <Hourglass className="h-10 w-10" strokeWidth={1.5} />
            <div>
              <h1 className="text-4xl font-bold heading tracking-wide">CHRONOS</h1>
              <p className="text-sm text-muted-foreground">Build your case chronology instantly</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="border-b border-foreground/10 bg-background">
        <div className="container mx-auto">
          <div className="flex justify-center gap-12 py-4">
            <Link
              href="/"
              className={`text-base font-medium transition-colors ${
                location === "/"
                  ? "font-bold border-b-2 border-foreground pb-1"
                  : "text-foreground hover:text-[#2C3E50]"
              }`}
            >
              Upload Documents
            </Link>
            <Link
              href="/chronology"
              className={`text-base font-medium transition-colors ${
                location === "/chronology"
                  ? "font-bold border-b-2 border-foreground pb-1"
                  : "text-foreground hover:text-[#2C3E50]"
              }`}
            >
              View Chronology
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
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
