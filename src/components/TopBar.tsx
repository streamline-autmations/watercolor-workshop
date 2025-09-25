import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bookmark, UserCircle, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchModal } from './SearchModal';
import { useUserState } from '@/hooks/useUserState';
import { ThemeToggle } from './ThemeToggle';

export const TopBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { bookmarks } = useUserState();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-blom-dark-bg/80 shadow-sm backdrop-blur-lg' : 'bg-transparent'}`}>
        <div className="container mx-auto flex items-center justify-between flex-wrap py-4 md:h-20 md:flex-nowrap md:py-0">
          <Link to="/home" className="flex items-center gap-2">
            <img src="/blom-academy.png" alt="BLOM Academy Logo" className="h-10 md:h-12" />
          </Link>

          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link to="/home" className="text-2xl font-bold text-ink tracking-tight">
              BLOM Academy
            </Link>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" className="rounded-full hidden sm:flex" asChild>
              <Link to="/explore">
                <Compass className="h-5 w-5 mr-2" />
                Explore
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5 text-body-text" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full relative" asChild>
              <Link to="/bookmarks">
                <Bookmark className="h-5 w-5 text-body-text" />
                {bookmarks.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-xs">
                    {bookmarks.length}
                  </span>
                )}
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full" asChild>
              <Link to="/profile">
                <UserCircle className="h-6 w-6 text-body-text" />
              </Link>
            </Button>
          </nav>

          <div className="w-full text-center mt-2 md:hidden">
            <Link to="/home" className="text-xl font-bold text-ink tracking-tight">
                BLOM Academy
            </Link>
          </div>
        </div>
      </header>
      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
};