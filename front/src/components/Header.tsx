import { Sparkles } from "lucide-react";

const Header = () => {
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a 
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Kursovik</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">ИИ-генератор учебных материалов</p>
          </div>
        </a>
        
        <nav className="hidden md:flex items-center gap-6">
          <div className="relative group">
            <a href="" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Возможности
            </a>
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-border shadow-md">
              Безграничны
            </div>
          </div>
          <div className="relative group">
            <a href="" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Тарифы
            </a>
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-border shadow-md">
              Бесплатно
            </div>
          </div>
          <div className="relative group">
            <a href="" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Документация
            </a>
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-border shadow-md">
              Не требуется
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
