'use client'

import { useState } from 'react'
import { useRelationshipsStore } from '../lib/store'
import NetworkGraph from './NetworkGraph'

export default function EmailList() {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(formatDate(oneYearAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pageToken, setPageToken] = useState<string | null>(null)
  const [processedEmails, setProcessedEmails] = useState<any[]>([])
  const [relationshipProgress, setRelationshipProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])

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
    if (!emails || emails.length === 0) return;
    try {
      const response = await fetch('/api/emails/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = await response.json();
      console.log(data)
      if (data.success && data.data) {
        const newProfiles = data.data.profiles;
        setProfiles(prevProfiles => [...prevProfiles, ...newProfiles]);

        // Upsert profiles into the database
        await upsertProfiles(newProfiles);

        // Pass both the new profiles and their corresponding emails
        await analyzeRelationships(newProfiles, emails);
      }
    } catch (error) {
      console.error('Error processing emails with AI:', error);
      setError(error.message);
    }
  };

  // Function to upsert profiles
  const upsertProfiles = async (profiles: any[]) => {
    try {
      const response = await fetch('/api/users/generate-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles }),
      });

      if (!response.ok) {
        throw new Error('Failed to upsert profiles');
      }

      console.log('Profiles upserted successfully');
    } catch (error) {
      console.error('Error upserting profiles:', error);
    }
  };

  const analyzeRelationships = async (profiles: any[], emailsToAnalyze: any[]) => {
    try {
      const response = await fetch('/api/relationships/analyze-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profiles,
          emails: emailsToAnalyze // Pass the actual emails we're analyzing
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setRelationships(data.relationships);
      }
    } catch (error) {
      console.error('Error analyzing relationships:', error);
    }
  };

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
        {processedEmails.map((email) => (
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

      {profiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Profiles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {profile.name !== 'Unknown' ? profile.name : profile.email}
                    </h4>
                    {profile.name !== 'Unknown' && (
                      <p className="text-sm text-gray-500">{profile.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Communication Style:</span> {profile.communication_style}
                  </p>
                  <div>
                    <span className="font-medium">Interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.interests?.map((interest: string, i: number) => (
                        <span key={i} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Personality Traits:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.personality_traits?.map((trait: string, i: number) => (
                        <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Relationship Network</h3>
          <NetworkGraph profiles={profiles} relationships={relationships} />
        </div>
      )}
    </div>
  )
} 