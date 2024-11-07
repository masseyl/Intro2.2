'use client';

import { useEffect, useState } from 'react';
import { useRelationshipsStore } from '../lib/store';

interface Profile {
  email: string;
  profile: {
    communication_style: string;
    interests: string[];
    personality_traits: string[];
    common_topics: string[];
  };
}

export default function DashboardStats() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('/api/users/profiles');
        if (!response.ok) throw new Error('Failed to fetch profiles');
        const data = await response.json();
        setProfiles(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {/* Profile List Card */}
      <div className="bg-white rounded-lg shadow p-6 col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Profiles</h3>
          <span className="text-sm text-gray-500">{profiles.length} profiles</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : (
          <div className="overflow-y-auto max-h-96 space-y-4">
            {profiles.map((profile, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{profile.email}</h4>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Communication Style:</span> {profile.profile.communication_style}</p>
                  <div>
                    <span className="font-medium">Interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.profile.interests.map((interest, i) => (
                        <span key={i} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Personality Traits:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.profile.personality_traits.map((trait, i) => (
                        <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Common Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.profile.common_topics.map((topic, i) => (
                        <span key={i} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keep other stats cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="ml-3">
            <dt className="text-lg font-semibold text-gray-900">Active Conversations</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">
              {profiles.length > 0 ? profiles.length : '---'}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
} 