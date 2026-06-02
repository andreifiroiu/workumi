import { useState } from 'react'
import { ArrowRight, ArrowLeft, Check, Building2, CreditCard, Users, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CreateOrganizationProps, TeamInvite } from '@/../product/sections/usermenu/types'

type Step = 'name' | 'plan' | 'team' | 'confirm'

export function CreateOrganization({ plans, onCreate, onCancel }: CreateOrganizationProps) {
  const [currentStep, setCurrentStep] = useState<Step>('name')
  const [orgName, setOrgName] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Member'>('Member')

  const steps: { id: Step; label: string; icon: LucideIcon }[] = [
    { id: 'name', label: 'Name', icon: Building2 },
    { id: 'plan', label: 'Plan', icon: CreditCard },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'confirm', label: 'Confirm', icon: Check },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  const canProceed = () => {
    if (currentStep === 'name') return orgName.trim().length > 0
    if (currentStep === 'plan') return selectedPlanId.length > 0
    return true
  }

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const handleAddInvite = () => {
    if (inviteEmail.trim() && inviteEmail.includes('@')) {
      setTeamInvites([...teamInvites, { email: inviteEmail, role: inviteRole }])
      setInviteEmail('')
      setInviteRole('Member')
    }
  }

  const handleRemoveInvite = (index: number) => {
    setTeamInvites(teamInvites.filter((_, i) => i !== index))
  }

  const handleCreate = () => {
    onCreate?.({
      name: orgName,
      planId: selectedPlanId,
      teamInvites: teamInvites.length > 0 ? teamInvites : undefined,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Create Organization
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Set up a new workspace for your team
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isComplete = index < currentStepIndex
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${
                          isComplete
                            ? 'bg-emerald-500 dark:bg-emerald-600'
                            : isActive
                            ? 'bg-indigo-600 dark:bg-indigo-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }
                      `}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon
                          className={`w-5 h-5 ${
                            isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`
                        mt-2 text-sm font-medium
                        ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : isComplete
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      `}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        h-0.5 flex-1 mx-2 transition-colors
                        ${
                          index < currentStepIndex
                            ? 'bg-emerald-500 dark:bg-emerald-600'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }
                      `}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 mb-6">
          {/* Step: Name */}
          {currentStep === 'name' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                  Name your organization
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Choose a name that represents your team or project
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Acme Agency, Dev Studio, My Project"
                  className="w-full px-4 py-3 text-lg rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step: Plan */}
          {currentStep === 'plan' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                  Choose your plan
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Select the plan that fits your needs. You can upgrade anytime.
                </p>
              </div>
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`
                      relative p-6 rounded-xl border-2 text-left transition-all
                      ${
                        selectedPlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                            {plan.name}
                          </h3>
                          {plan.isPopular && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                            ${plan.price}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            /{plan.billingPeriod}
                          </span>
                        </div>
                      </div>
                      {selectedPlanId === plan.id && (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Team */}
          {currentStep === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                  Invite your team
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Add team members to your organization (optional)
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid sm:grid-cols-12 gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="sm:col-span-7 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInvite()}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Member')}
                    className="sm:col-span-3 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddInvite}
                    className="sm:col-span-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {teamInvites.length > 0 ? (
                <div className="space-y-2">
                  {teamInvites.map((invite, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">
                          {invite.email}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {invite.role}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveInvite(index)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No team members added yet. You can invite people later.
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                  Review and confirm
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Double-check your organization details before creating
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">
                        Organization Name
                      </h3>
                      <p className="text-lg text-slate-700 dark:text-slate-300">{orgName}</p>
                    </div>
                  </div>

                  {selectedPlan && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mb-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">
                            {selectedPlan.name} Plan
                          </h3>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            ${selectedPlan.price}
                            <span className="text-base font-normal text-slate-600 dark:text-slate-400">
                              /{selectedPlan.billingPeriod}
                            </span>
                          </p>
                        </div>
                        {selectedPlan.isPopular && (
                          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {selectedPlan.features.slice(0, 3).map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {teamInvites.length > 0 && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-3">
                        Team Invites ({teamInvites.length})
                      </h3>
                      <div className="space-y-2">
                        {teamInvites.map((invite, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-700 dark:text-slate-300">
                              {invite.email}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {invite.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-900 dark:text-indigo-200">
                    By creating this organization, you agree to our Terms of Service and Privacy
                    Policy. You can manage billing and subscription details in organization
                    settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-2.5 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep !== 'confirm' ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`
                  px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium transition-colors
                  ${
                    canProceed()
                      ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }
                `}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                className="px-6 py-2.5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Create Organization
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
