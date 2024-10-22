// components/UserProfileMenu.tsx

import React from 'react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings } from 'lucide-react'

interface UserProfileMenuProps {
  userProfile: { name: string, email: string, image?: string }
  onLogout: () => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (value: boolean) => void
}

export default function UserProfileMenu({
  userProfile,
  onLogout,
  isSettingsOpen,
  setIsSettingsOpen
}: UserProfileMenuProps) {
  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8">
            {/* Check if userProfile.image exists, if not, render fallback */}
            {userProfile.image ? (
              <AvatarImage src={userProfile.image} alt={userProfile.name} />
            ) : (
              <AvatarFallback>{userProfile.name.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{userProfile.name}</p>
              <p className="text-xs text-gray-400">{userProfile.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
