import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2">
      <nav className="flex space-x-6 border-b border-white/10 pb-4">
        <Link 
          href="/" 
          className="text-white/70 hover:text-cat-accent transition-colors font-medium tracking-wider"
        >
          // TIMELINE
        </Link>
        <Link 
          href="/bbs" 
          className="text-white/70 hover:text-cat-accent transition-colors font-medium tracking-wider"
        >
          // BBS (板)
        </Link>
      </nav>
    </header>
  );
}
