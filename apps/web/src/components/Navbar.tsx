import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-[#0ABAB5] border-b border-white/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="block w-8" />
        <div className="flex items-center gap-8">
          <Link
            href="/services"
            className="text-sm text-white/80 hover:text-white transition-colors tracking-wide"
          >
            Services
          </Link>
          <Link
            href="/#branches"
            className="text-sm text-white/80 hover:text-white transition-colors tracking-wide"
          >
            Branches
          </Link>
          <Link
            href="/track"
            className="text-sm text-white/80 hover:text-white transition-colors tracking-wide"
          >
            Track Order
          </Link>
          <Link
            href="/#contact"
            className="text-sm text-white/80 hover:text-white transition-colors tracking-wide"
          >
            Contact
          </Link>
          <Link
            href="/book"
            className="rounded-sm bg-white px-5 py-2 text-sm font-medium text-[#0ABAB5] hover:bg-white/90 transition-colors tracking-wide"
          >
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
