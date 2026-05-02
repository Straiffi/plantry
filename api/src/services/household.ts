import { randomBytes } from 'node:crypto'

import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import { db, householdMembers, households, inviteCodes } from '@recipe-app/db'

type Household = typeof households.$inferSelect
type HouseholdMember = typeof householdMembers.$inferSelect
type InviteCode = typeof inviteCodes.$inferSelect
type DatabaseLike = Pick<typeof db, 'insert' | 'query' | 'select' | 'transaction' | 'update'>

export type CurrentHousehold = {
  household: Household
  membership: HouseholdMember
}

type CreateHouseholdInput = {
  name: string
  userId: string
}

type CreateInviteCodeInput = {
  expiresAt?: Date | null
  householdId: string
  userId: string
}

type JoinHouseholdByInviteCodeInput = {
  code: string
  userId: string
}

type HouseholdRepository = {
  consumeInviteCode: (inviteCodeId: string, usedAt: Date) => Promise<InviteCode | null>
  findActiveInviteCodeByCode: (code: string, now: Date) => Promise<InviteCode | null>
  findCurrentHouseholdForUser: (userId: string) => Promise<CurrentHousehold | null>
  findHouseholdById: (householdId: string) => Promise<Household | null>
  insertHousehold: (input: { name: string }) => Promise<Household>
  insertHouseholdMembership: (input: { householdId: string; role: string; userId: string }) => Promise<HouseholdMember>
  insertInviteCode: (input: {
    code: string
    createdByUserId: string
    expiresAt: Date | null
    householdId: string
  }) => Promise<InviteCode>
  listActiveInviteCodesByHousehold: (householdId: string, now: Date) => Promise<InviteCode[]>
  transaction: <T>(callback: (repository: HouseholdRepository) => Promise<T>) => Promise<T>
}

export class HouseholdServiceError extends Error {
  code: 'HOUSEHOLD_EXISTS' | 'INVITE_CODE_GENERATION_FAILED' | 'INVALID_INVITE_CODE' | 'NO_HOUSEHOLD'

  constructor(
    code: 'HOUSEHOLD_EXISTS' | 'INVITE_CODE_GENERATION_FAILED' | 'INVALID_INVITE_CODE' | 'NO_HOUSEHOLD',
    message: string,
  ) {
    super(message)
    this.code = code
  }
}

const normalizeInviteCode = (code: string) => {
  return code.trim().toUpperCase()
}

const generateInviteCode = () => {
  return randomBytes(8)
    .toString('base64url')
    .replace(/[^A-Z0-9]/gi, '')
    .slice(0, 10)
    .toUpperCase()
}

const isUniqueViolation = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export const createHouseholdRepository = (database: DatabaseLike = db): HouseholdRepository => {
  return {
    consumeInviteCode: async (inviteCodeId, usedAt) => {
      const [inviteCodeRecord] = await database
        .update(inviteCodes)
        .set({ usedAt })
        .where(and(eq(inviteCodes.id, inviteCodeId), isNull(inviteCodes.usedAt)))
        .returning()

      return inviteCodeRecord ?? null
    },
    findActiveInviteCodeByCode: async (code, now) => {
      const inviteCodeRecord = await database.query.inviteCodes.findFirst({
        where: and(
          eq(inviteCodes.code, code),
          isNull(inviteCodes.usedAt),
          or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
        ),
      })

      return inviteCodeRecord ?? null
    },
    findCurrentHouseholdForUser: async (userId) => {
      const membershipRecord = await database.query.householdMembers.findFirst({
        where: eq(householdMembers.userId, userId),
        with: {
          household: true,
        },
      })

      if (!membershipRecord || !membershipRecord.household) {
        return null
      }

      const { household, ...membership } = membershipRecord

      return {
        household,
        membership,
      }
    },
    findHouseholdById: async (householdId) => {
      const householdRecord = await database.query.households.findFirst({
        where: eq(households.id, householdId),
      })

      return householdRecord ?? null
    },
    insertHousehold: async ({ name }) => {
      const [householdRecord] = await database.insert(households).values({ name }).returning()

      return householdRecord
    },
    insertHouseholdMembership: async ({ householdId, role, userId }) => {
      const [membershipRecord] = await database
        .insert(householdMembers)
        .values({ householdId, role, userId })
        .returning()

      return membershipRecord
    },
    insertInviteCode: async ({ code, createdByUserId, expiresAt, householdId }) => {
      const [inviteCodeRecord] = await database
        .insert(inviteCodes)
        .values({
          code,
          createdByUserId,
          expiresAt,
          householdId,
        })
        .returning()

      return inviteCodeRecord
    },
    listActiveInviteCodesByHousehold: async (householdId, now) => {
      return database
        .select()
        .from(inviteCodes)
        .where(and(
          eq(inviteCodes.householdId, householdId),
          isNull(inviteCodes.usedAt),
          or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
        ))
        .orderBy(desc(inviteCodes.createdAt))
    },
    transaction: async (callback) => {
      return database.transaction(async (transaction) => {
        return callback(createHouseholdRepository(transaction as unknown as DatabaseLike))
      })
    },
  }
}

export const createHouseholdService = (repository: HouseholdRepository = createHouseholdRepository()) => {
  const getCurrentHouseholdForUser = async (userId: string) => {
    return repository.findCurrentHouseholdForUser(userId)
  }

  const assertHouseholdMembership = async (userId: string) => {
    const currentHousehold = await repository.findCurrentHouseholdForUser(userId)

    if (!currentHousehold) {
      throw new HouseholdServiceError('NO_HOUSEHOLD', 'User does not belong to a household')
    }

    return currentHousehold
  }

  const createHousehold = async ({ name, userId }: CreateHouseholdInput) => {
    const currentHousehold = await repository.findCurrentHouseholdForUser(userId)

    if (currentHousehold) {
      throw new HouseholdServiceError('HOUSEHOLD_EXISTS', 'User already belongs to a household')
    }

    try {
      return repository.transaction(async (transactionRepository) => {
        const householdRecord = await transactionRepository.insertHousehold({ name })
        const membershipRecord = await transactionRepository.insertHouseholdMembership({
          householdId: householdRecord.id,
          role: 'owner',
          userId,
        })

        return {
          household: householdRecord,
          membership: membershipRecord,
        }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HouseholdServiceError('HOUSEHOLD_EXISTS', 'User already belongs to a household')
      }

      throw error
    }
  }

  const createInviteCode = async ({ expiresAt = null, householdId, userId }: CreateInviteCodeInput) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await repository.insertInviteCode({
          code: generateInviteCode(),
          createdByUserId: userId,
          expiresAt,
          householdId,
        })
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue
        }

        throw error
      }
    }

    throw new HouseholdServiceError('INVITE_CODE_GENERATION_FAILED', 'Could not generate an invite code')
  }

  const listInviteCodes = async (householdId: string, now: Date = new Date()) => {
    return repository.listActiveInviteCodesByHousehold(householdId, now)
  }

  const joinHouseholdByInviteCode = async ({ code, userId }: JoinHouseholdByInviteCodeInput) => {
    const currentHousehold = await repository.findCurrentHouseholdForUser(userId)

    if (currentHousehold) {
      throw new HouseholdServiceError('HOUSEHOLD_EXISTS', 'User already belongs to a household')
    }

    const normalizedCode = normalizeInviteCode(code)

    try {
      return repository.transaction(async (transactionRepository) => {
        const now = new Date()
        const inviteCodeRecord = await transactionRepository.findActiveInviteCodeByCode(normalizedCode, now)

        if (!inviteCodeRecord) {
          throw new HouseholdServiceError('INVALID_INVITE_CODE', 'Invite code is invalid or no longer active')
        }

        const consumedInviteCode = await transactionRepository.consumeInviteCode(inviteCodeRecord.id, now)

        if (!consumedInviteCode) {
          throw new HouseholdServiceError('INVALID_INVITE_CODE', 'Invite code is invalid or no longer active')
        }

        const householdRecord = await transactionRepository.findHouseholdById(inviteCodeRecord.householdId)

        if (!householdRecord) {
          throw new HouseholdServiceError('INVALID_INVITE_CODE', 'Invite code is invalid or no longer active')
        }

        const membershipRecord = await transactionRepository.insertHouseholdMembership({
          householdId: householdRecord.id,
          role: 'member',
          userId,
        })

        return {
          household: householdRecord,
          membership: membershipRecord,
        }
      })
    } catch (error) {
      if (error instanceof HouseholdServiceError) {
        throw error
      }

      if (isUniqueViolation(error)) {
        throw new HouseholdServiceError('HOUSEHOLD_EXISTS', 'User already belongs to a household')
      }

      throw error
    }
  }

  return {
    assertHouseholdMembership,
    createHousehold,
    createInviteCode,
    getCurrentHouseholdForUser,
    joinHouseholdByInviteCode,
    listInviteCodes,
  }
}

export const householdService = createHouseholdService()
