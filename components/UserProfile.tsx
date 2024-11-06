import Image from 'next/image'

interface UserProfileProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 flex items-center space-x-4">
      {user.image && (
        <Image
          src={user.image}
          alt={user.name || 'User'}
          width={64}
          height={64}
          className="rounded-full"
        />
      )}
      <div>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <p className="text-gray-600">{user.email}</p>
      </div>
    </div>
  )
}
