"use client";

/**
 * Category rail with active-route highlighting. Client-side only for
 * usePathname; the items themselves are server-rendered props, so the rail
 * still works as plain links before/without hydration. The list is centered
 * and wraps on narrow screens — with 8+ categories a single row cannot fit
 * a phone, and nowrap would push the page wide.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface HeaderNavItem {
  href: string;
  label: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ items }: { items: HeaderNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Categories"
      className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10"
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pb-2.5 text-[13px]">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap transition-colors hover:text-wine-900 hover:underline ${
                  active
                    ? "font-medium text-wine-900 underline underline-offset-4"
                    : "text-wine-900/70"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
