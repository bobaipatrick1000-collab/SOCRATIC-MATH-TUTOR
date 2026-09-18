"use client"

import katex from "katex"

export function TeX({
  tex,
  display = true,
  className = "",
}: {
  tex: string
  display?: boolean
  className?: string
}) {
  let html: string
  try {
    html = katex.renderToString(tex, { throwOnError: false, displayMode: display })
  } catch {
    html = tex
  }
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}