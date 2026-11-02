"use client";

/**
 * Category rail with active-route highlighting. Client-side only for
 * usePathname; the items themselves are server-rendered props, so the rail
 * still works as plain links before/without hydration.
 *
 * Phase 22 placement: one component, two layouts — inside the header's
 * flex-wrap row it renders inline (centered links on lg+) or as the
 * wrapped centered rail on its own line below lg. `className` carries the
 * responsive placement; the list itself is always centered and wraps
 * rather than overflowing.
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

export function HeaderNav({
  items,
  className = "",
}: {
  items: HeaderNavItem[];
  /** Placement classes from the header row (inline vs full-width rail). */
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px]">
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
