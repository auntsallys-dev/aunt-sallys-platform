import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-[#111] border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.jpg"
            alt="Aunt Sally's Laundry"
            width={52}
            height={52}
            className="rounded-sm"
            priority
          />
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/services"
            className="text-sm text-white/60 hover:text-white transition-colors tracking-wide"
          >
            Services
          </Link>
          <Link
            href="/#branches"
            className="text-sm text-white/60 hover:text-white transition-colors tracking-wide"
          >
            Branches
          </Link>
          <Link
            href="/track"
            className="text-sm text-white/60 hover:text-white transition-colors tracking-wide"
          >
            Track Order
          </Link>
          <Link
            href="/book"
            className="rounded-sm bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors tracking-wide"
          >
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
