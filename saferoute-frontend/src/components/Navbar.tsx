import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Shield, Map, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BrandName } from '@/components/BrandName'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Safe Map' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path))

  return (
    <nav className="fixed top-3 left-3 right-3 z-50 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 cursor-pointer transition-opacity duration-200 hover:opacity-80"
        >
          <Shield className="h-6 w-6 text-primary" />
          <BrandName className="font-bold text-lg" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                isActive(link.to)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Button
            asChild
            variant="default"
            size="sm"
            className="cursor-pointer gap-1.5"
          >
            <Link to="/map">
              <Map className="h-4 w-4" />
              Plan Route
            </Link>
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                aria-label="Open menu"
              >
                {open ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72 bg-card p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>

              <div className="flex flex-col h-full">
                {/* Mobile brand header */}
                <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
                  <Shield className="h-5 w-5 text-primary" />
                  <BrandName className="font-bold text-lg" />
                </div>

                {/* Mobile nav links */}
                <div className="flex flex-col gap-1 px-3 py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        isActive(link.to)
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Mobile CTA */}
                <div className="mt-auto px-4 pb-6">
                  <Button
                    asChild
                    variant="default"
                    className="w-full cursor-pointer gap-1.5"
                    onClick={() => setOpen(false)}
                  >
                    <Link to="/map">
                      <Map className="h-4 w-4" />
                      Plan Route
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
