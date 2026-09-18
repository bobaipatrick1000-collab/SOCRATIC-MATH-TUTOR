"use client"

import { use } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Workspace } from "@/components/Workspace"

function Inner({ itemId }: { itemId: string }) {
  const sp = useSearchParams()
  const origin = (sp.get("src") as "practice" | "photo" | "lesson" | null) ?? "practice"
  const twRaw = sp.get("tw") ?? "0"
  const twNonce = /^\d+$/.test(twRaw) ? Number(twRaw) : 0
  return <Workspace key={itemId} itemId={itemId} origin={origin} initialNonce={twNonce} />
}

export default function WorkspacePage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params)
  return (
    <Suspense fallback={<div className="paper" style={{ padding: 60 }}>Loading workspace…</div>}>
      <Inner itemId={itemId} />
    </Suspense>
  )
}