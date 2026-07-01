import Link from "next/link";
import { Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Zap className="h-6 w-6 text-electric-blue" />
        <h1 className="text-xl font-semibold tracking-tight">APHELION AI</h1>
      </Link>
      
      <nav className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <Link href="/forecast" className="hover:text-foreground transition-colors">Forecast Center</Link>
        <Link href="/history" className="hover:text-foreground transition-colors">Historical Analysis</Link>
        <Link href="/research" className="hover:text-foreground transition-colors">Research Explorer</Link>
        <Link href="/architecture" className="hover:text-foreground transition-colors">Architecture</Link>
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <Badge variant="outline" className="hidden sm:inline-flex bg-emerald/10 text-emerald border-emerald/20">
          SOLEXS ACTIVE
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Clock className="h-4 w-4" />
          <span>{new Date().toISOString().split("T")[1].split(".")[0]} UTC</span>
        </div>
      </div>
    </header>
  );
}
