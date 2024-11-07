'use client'

import { useState } from 'react'
import { useRelationshipsStore } from '../lib/store'

export default function EmailList() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pageToken, setPageToken] = useState<string | null>(null)

  const fetchEmails = async (token?: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/emails?startDate=${startDate}&endDate=${endDate}${token ? `&pageToken=${token}` : ''}`,
        {
          credentials: 'include',
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 401) {
          window.location.href = '/api/auth/signin'
          return
        }
        throw new Error(errorData.error || 'Failed to fetch emails')
      }

      const data = await response.json()
      const messages = data.messages || []
      
      if (token) {
        setEmails(prev => [...prev, ...messages])
      } else {
        setEmails(messages)
      }
      setPageToken(data.nextPageToken)

      if (messages.length > 0) {
        await processEmailsWithAI(messages)
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const processEmailsWithAI = async (emails: any[]) => {
    if (!emails || emails.length === 0) return

    try {
      const response = await fetch('/api/emails/extract', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 401) {
          window.location.href = '/api/auth/signin'
          return
        }
        throw new Error(errorData.error || `Error: ${response.status}`)
      }

      const result = await response.json()
      console.log('AI processing result:', result)
    } catch (error) {
      console.error('Error processing emails with AI:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => fetchEmails()}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Analyze Emails'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {emails.map((email) => (
          <div key={email.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="font-medium text-gray-900">{email.subject}</div>
            <div className="text-sm text-gray-600">To: {email.to}</div>
            <div className="text-sm text-gray-500">{new Date(email.date).toLocaleDateString()}</div>
            <div className="mt-2 text-sm text-gray-700">{email.snippet}</div>
          </div>
        ))}
      </div>

      {pageToken && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchEmails(pageToken)}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
} 