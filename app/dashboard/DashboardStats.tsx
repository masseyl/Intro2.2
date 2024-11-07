import React from 'react';

const DashboardStats: React.FC = () => {
  const stats = [
    {
      name: 'Total Connections',
      stat: relationships.length,
      icon: <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>,
    },
    {
      name: 'Active Conversations',
      stat: relationships.filter(r => r.emailCount > 0).length,
      icon: <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-lg rounded-lg overflow-hidden"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">{item.icon}</div>
            <div className="ml-3">
              <dt className="text-lg font-semibold text-gray-800 truncate">
                {item.name}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {item.stat}
              </dd>
            </div>
          </div>
          <button className="bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded">
            Analyze Emails
          </button>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats; 