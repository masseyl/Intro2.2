import Link from "next/link";
import RelationshipGraph from '@/components/RelationshipGraph'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <header className="bg-purple-800 shadow-md w-full p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Gmail Social Mapper</h1>
        <div className="flex items-center">
          <div className="bg-white text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            L
          </div>
          <span className="text-white ml-2">Lance Massey</span>
          <Link href="/dashboard" className="text-white ml-4">Dashboard</Link>
          <button className="ml-4 text-white bg-red-500 px-3 py-1 rounded hover:bg-red-600">
            Sign Out
          </button>
        </div>
      </header>
      <main className="flex flex-col items-center mt-10 w-full max-w-7xl px-4">
        <h2 className="text-3xl font-semibold text-white mb-8">
          Your Email Network
        </h2>
        <RelationshipGraph />
      </main>
    </div>
  );
}
