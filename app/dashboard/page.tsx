import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { redirect } from "next/navigation"
import UserProfile from "@/components/UserProfile"
import GraphVisualization from "@/components/GraphVisualization"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/api/auth/signin")
  }

  return (
    <div className="flex flex-col space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <UserProfile user={session.user} />
      <GraphVisualization />
    </div>
  )
}
