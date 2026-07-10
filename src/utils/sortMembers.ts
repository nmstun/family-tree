import { FamilyMember } from '@/types'

export function sortMembersByName(members: FamilyMember[]): FamilyMember[] {
  return members
    .slice()
    .sort((a, b) =>
      `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja')
    )
}
