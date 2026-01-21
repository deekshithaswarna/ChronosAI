import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Hourglass } from "lucide-react";
import { Route, Switch, useLocation, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ChronologyTable from "./pages/TimelineTable";
import NotFound from "./pages/NotFound";

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="bg-card border-b-2 border-foreground shadow-sm">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <Hourglass className="h-10 w-10 text-foreground" strokeWidth={2.5} />
            <h1 className="text-4xl font-bold heading uppercase tracking-wider">
              CHRONOS
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Legal Document Analysis & Chronology Tool
          </p>
        </div>
      </header>

      {/* Segmented Navigation */}
      <nav className="bg-card border-b border-foreground/20">
        <div className="container">
          <div className="flex justify-center gap-0">
            <Link href="/">
              <button
                className={`px-8 py-4 font-bold heading text-base transition-all duration-200 border-2 ${
                  location === "/"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground hover:bg-foreground/10"
                }`}
              >
                Document Workspace
              </button>
            </Link>
            <Link href="/chronology">
              <button
                className={`px-8 py-4 font-bold heading text-base transition-all duration-200 border-2 border-l-0 ${
                  location === "/chronology"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground hover:bg-foreground/10"
                }`}
              >
                Chronology Table
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
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
