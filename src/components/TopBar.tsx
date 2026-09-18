"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpen, GraduationCap, Moon, ScanLine, Sun, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      const stored = localStorage.getItem("aurea:theme")
      setDark((stored ?? "light") === "dark")
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? "dark" : "light"
    try {
      localStorage.setItem("aurea:theme", next ? "dark" : "light")
    } catch {
      void 0
    }
  }

  return (
    <button className="icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

const LINKS = [
  { href: "/topics", label: "Topics", icon: BookOpen },
  { href: "/upload", label: "Upload", icon: ScanLine },
  { href: "/skills", label: "Skills", icon: GraduationCap },
]

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Sparkles size={15} />
        </span>
        Aurea
      </Link>
      <nav className="nav-links">
        {LINKS.map((l) => {
          const Icon = l.icon
          const active = pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href} className={`nav-link${active ? " active" : ""}`}>
              <Icon size={13} />
              {l.label}
            </Link>
          )
        })}
      </nav>
      <div className="topbar-end">
        <span className="ghost-chip">Guest · progress saved</span>
        <ThemeToggle />
      </div>
    </header>
  )
}