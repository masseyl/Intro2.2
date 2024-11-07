import Link from "next/link";

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
      <main className="flex flex-col items-center mt-10">
        <h2 className="text-3xl font-semibold text-white">
          Welcome to Your Email Network
        </h2>
        <p className="mt-4 text-lg text-gray-300 text-center">
          Visualize and analyze your email relationships to gain insights into your professional network.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150"
        >
          Go to Dashboard
        </Link>
      </main>
    </div>
  );
}
