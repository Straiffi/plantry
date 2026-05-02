import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, LogOut, Mail, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAppContext } from '@/app/app-context'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const SettingsPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { household, householdMembership, user } = useAppContext()
  const householdMembersQuery = useQuery({
    queryFn: api.getHouseholdMembers,
    queryKey: ['household-members'],
  })
  const inviteCodesQuery = useQuery({
    queryFn: api.getInviteCodes,
    queryKey: ['invite-codes'],
  })
  const createInviteCodeMutation = useMutation({
    mutationFn: api.createInviteCode,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invite-codes'] })
    },
  })

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.assign('/login')
  }

  const handleCopyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('settings.title')} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.householdTitle')}</CardTitle>
              <CardDescription>{t('settings.householdDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-foreground">
                  <Users className="size-4 text-primary" />
                  <span className="font-medium">{household?.name ?? t('settings.noHousehold')}</span>
                </div>
                {householdMembership && <Badge variant="outline">{t('settings.roleLabel', { role: householdMembership.role })}</Badge>}
              </div>

              <div className="space-y-3 border-t border-border/60 pt-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t('settings.membersTitle')}</p>
                  <p>{t('settings.membersDescription')}</p>
                </div>

                {householdMembersQuery.error && <p className="text-sm text-destructive">{t('settings.membersError')}</p>}
                {!householdMembersQuery.isPending && (householdMembersQuery.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('settings.membersEmpty')}</p>
                )}

                {(householdMembersQuery.data ?? []).map((member) => (
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3" key={member.id}>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-foreground">
                        <p className="font-medium">{member.user.name}</p>
                        {member.userId === user.id && <Badge variant="outline">{t('settings.youLabel')}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.accountTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button onClick={handleSignOut} type="button" variant="outline">
                <LogOut className="size-4" />
                <span>{t('settings.signOut')}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.invitesTitle')}</CardTitle>
            <CardDescription>{t('settings.invitesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button disabled={createInviteCodeMutation.isPending} onClick={() => createInviteCodeMutation.mutate()} type="button">
              <Copy className="size-4" />
              <span>{t('settings.createInvite')}</span>
            </Button>

            <div className="space-y-3">
              {(inviteCodesQuery.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('settings.noInvites')}</p>}
              {(inviteCodesQuery.data ?? []).map((inviteCode) => (
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3" key={inviteCode.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm font-semibold tracking-[0.25em] text-foreground">{inviteCode.code}</p>
                    <Button onClick={() => void handleCopyInviteCode(inviteCode.code)} size="xs" type="button" variant="outline">
                      <Copy className="size-3.5" />
                      <span>{t('settings.copyInviteCode')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
