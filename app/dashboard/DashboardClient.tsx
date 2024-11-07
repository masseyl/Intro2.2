'use client'

import UserProfile from "../../components/UserProfile"
import EmailList from "../../components/EmailList"
import { User } from "next-auth"
import { useRelationshipsStore } from "../../lib/store"

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const relationships = useRelationshipsStore((state) => state.data)

  const stats = [
    {
      name: 'Total Connections',
      value: relationships.length,
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Active Conversations',
      value: relationships.filter(r => r.emailCount > 0).length,
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      change: '+4%',
      changeType: 'positive',
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="relative bg-white shadow-lg rounded-lg p-4">
        <UserProfile user={user} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {stats.map((item) => (
            <div key={item.name} className="p-4 bg-white rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-white transition-colors duration-200">
                  {item.icon}
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-600 truncate">
                    {item.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {item.value}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.change}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          ))}
        </div> */}

        <div className="mt-8 grid grid-cols-1 gap-8 ">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Email Analysis
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Analyze your email communications within a specific date range
              </p>
            </div>
            <div className="px-6 py-4">
              <EmailList />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 