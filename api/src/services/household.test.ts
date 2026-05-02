import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createHouseholdService, HouseholdServiceError } from './household.js'

const createRepositoryMock = () => {
  const repository = {
    consumeInviteCode: vi.fn(),
    findActiveInviteCodeByCode: vi.fn(),
    findCurrentHouseholdForUser: vi.fn(),
    findHouseholdById: vi.fn(),
    insertHousehold: vi.fn(),
    insertHouseholdMembership: vi.fn(),
    insertInviteCode: vi.fn(),
    listActiveInviteCodesByHousehold: vi.fn(),
    transaction: vi.fn(),
  }

  repository.transaction.mockImplementation(async (callback) => callback(repository))

  return repository
}

describe('householdService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a household with an owner membership', async () => {
    const repository = createRepositoryMock()
    const service = createHouseholdService(repository)
    const household = {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'household-1',
      name: 'Home',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    const membership = {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'membership-1',
      role: 'owner',
      userId: 'user-1',
    }

    repository.findCurrentHouseholdForUser.mockResolvedValue(null)
    repository.insertHousehold.mockResolvedValue(household)
    repository.insertHouseholdMembership.mockResolvedValue(membership)

    await expect(service.createHousehold({ name: 'Home', userId: 'user-1' })).resolves.toEqual({
      household,
      membership,
    })

    expect(repository.insertHousehold).toHaveBeenCalledWith({ name: 'Home' })
    expect(repository.insertHouseholdMembership).toHaveBeenCalledWith({
      householdId: 'household-1',
      role: 'owner',
      userId: 'user-1',
    })
  })

  it('rejects household creation when the user already belongs to a household', async () => {
    const repository = createRepositoryMock()
    const service = createHouseholdService(repository)

    repository.findCurrentHouseholdForUser.mockResolvedValue({
      household: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: 'household-1',
        name: 'Home',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      membership: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        userId: 'user-1',
      },
    })

    await expect(service.createHousehold({ name: 'Home', userId: 'user-1' })).rejects.toMatchObject({
      code: 'HOUSEHOLD_EXISTS',
    } satisfies Partial<HouseholdServiceError>)
  })

  it('joins a household from an active invite code and consumes the code', async () => {
    const repository = createRepositoryMock()
    const service = createHouseholdService(repository)
    const household = {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'household-1',
      name: 'Home',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    const membership = {
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'membership-2',
      role: 'member',
      userId: 'user-2',
    }

    repository.findCurrentHouseholdForUser.mockResolvedValue(null)
    repository.findActiveInviteCodeByCode.mockResolvedValue({
      code: 'WELCOME123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      createdByUserId: 'user-1',
      expiresAt: null,
      householdId: 'household-1',
      id: 'invite-1',
      usedAt: null,
    })
    repository.consumeInviteCode.mockResolvedValue({
      code: 'WELCOME123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      createdByUserId: 'user-1',
      expiresAt: null,
      householdId: 'household-1',
      id: 'invite-1',
      usedAt: new Date('2026-01-02T00:00:00.000Z'),
    })
    repository.findHouseholdById.mockResolvedValue(household)
    repository.insertHouseholdMembership.mockResolvedValue(membership)

    await expect(service.joinHouseholdByInviteCode({ code: ' welcome123 ', userId: 'user-2' })).resolves.toEqual({
      household,
      membership,
    })

    expect(repository.findActiveInviteCodeByCode).toHaveBeenCalledWith('WELCOME123', expect.any(Date))
    expect(repository.consumeInviteCode).toHaveBeenCalledWith('invite-1', expect.any(Date))
  })

  it('rejects inactive invite codes', async () => {
    const repository = createRepositoryMock()
    const service = createHouseholdService(repository)

    repository.findCurrentHouseholdForUser.mockResolvedValue(null)
    repository.findActiveInviteCodeByCode.mockResolvedValue(null)

    await expect(service.joinHouseholdByInviteCode({ code: 'missing', userId: 'user-2' })).rejects.toMatchObject({
      code: 'INVALID_INVITE_CODE',
    } satisfies Partial<HouseholdServiceError>)
  })
})
