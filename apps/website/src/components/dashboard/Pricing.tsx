"use client";

import React from 'react';
import { AlertTriangle, BadgeIndianRupee, Coins, CreditCard, Sparkles } from 'lucide-react';
import { ActivitySummary, UserProfile } from '@/lib/types';
import {
  FREE_CREDITS_FOR_NEW_USERS,
  MONTHLY_PLAN_CREDITS,
  TOP_UP_CREDITS,
  getCreditOverview,
  getPlanPriceLabel,
  getTopUpPriceLabel,
} from '@/lib/credit-plans';
import { createMonthlySubscription, createTopUpPaymentLink } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingProps {
  authToken: string;
  user: UserProfile;
  summary?: ActivitySummary | null;
  onUserSnapshot: (user: UserProfile) => void;
  onBillingRefresh: (options?: { syncSubscription?: boolean }) => Promise<{ user: UserProfile; summary: ActivitySummary | null } | null>;
}

type PendingReturnPurchase = {
  purchaseType: 'monthly_100' | 'top_up_10';
  baselinePurchasedCredits: number;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error || fallback;
  } catch {
    return error.message;
  }
}

export const Pricing: React.FC<PricingProps> = ({ authToken, user, summary, onUserSnapshot, onBillingRefresh }) => {
  const creditOverview = getCreditOverview(user, summary);
  const planPriceLabel = getPlanPriceLabel(user.countryCode);
  const topUpPriceLabel = getTopUpPriceLabel(user.countryCode);
  const hasMonthlyPlan = creditOverview.plan === 'monthly_100';
  const subscriptionStatus = user.subscriptionStatus;
  const hasPendingSubscriptionSetup = creditOverview.hasPendingSubscriptionSetup;
  const [activeCheckout, setActiveCheckout] = React.useState<'monthly_100' | 'top_up_10' | null>(null);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [returnSyncMessage, setReturnSyncMessage] = React.useState<string | null>(null);
  const [syncingAfterReturn, setSyncingAfterReturn] = React.useState(false);
  const [pendingReturnPurchase, setPendingReturnPurchase] = React.useState<PendingReturnPurchase | null>(null);
  const syncInFlightRef = React.useRef(false);

  const openCheckout = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const didPurchaseApply = React.useCallback(
    (purchaseType: 'monthly_100' | 'top_up_10', refreshedUser: UserProfile, refreshedSummary: ActivitySummary | null, baselinePurchasedCredits: number) => {
      const refreshedOverview = getCreditOverview(refreshedUser, refreshedSummary);
      if (purchaseType === 'monthly_100') {
        return refreshedOverview.plan === 'monthly_100';
      }

      return Math.max(0, Number(refreshedUser.purchasedCredits) || 0) > baselinePurchasedCredits;
    },
    []
  );

  const refreshAfterCheckoutReturn = React.useCallback(async () => {
    if (!pendingReturnPurchase || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    setSyncingAfterReturn(true);

    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const result = await onBillingRefresh({
          syncSubscription: pendingReturnPurchase.purchaseType === 'monthly_100',
        });

        if (
          result &&
          didPurchaseApply(
            pendingReturnPurchase.purchaseType,
            result.user,
            result.summary,
            pendingReturnPurchase.baselinePurchasedCredits
          )
        ) {
          setPendingReturnPurchase(null);
          setReturnSyncMessage(
            pendingReturnPurchase.purchaseType === 'monthly_100'
              ? 'Monthly subscription activated. Your cycle credits are live now.'
              : 'Top-up confirmed. Your 10 cycle credits are available now.'
          );
          return;
        }

        if (attempt < 5) {
          await wait(2000);
        }
      }

      setReturnSyncMessage('Payment is still processing. This page will update automatically when Razorpay confirmation lands.');
    } catch (error) {
      console.error('Failed to refresh billing after checkout return', error);
      setReturnSyncMessage('We could not refresh billing immediately. Stay on this page for a moment and it will retry when you return focus.');
    } finally {
      setSyncingAfterReturn(false);
      syncInFlightRef.current = false;
    }
  }, [didPurchaseApply, onBillingRefresh, pendingReturnPurchase]);

  React.useEffect(() => {
    if (!pendingReturnPurchase || typeof window === 'undefined') {
      return;
    }

    const onFocus = () => {
      void refreshAfterCheckoutReturn();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshAfterCheckoutReturn();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pendingReturnPurchase, refreshAfterCheckoutReturn]);

  const beginTopUpCheckout = async () => {
    setCheckoutError(null);
    setReturnSyncMessage(null);

    if (!creditOverview.canBuyTopUp) {
      setCheckoutError(
        hasMonthlyPlan
          ? 'Top-up opens only after the current monthly 100-credit cycle is fully used.'
          : 'Top-up is available only for users with an active monthly subscription.'
      );
      return;
    }

    setActiveCheckout('top_up_10');

    try {
      const response = await createTopUpPaymentLink(authToken);
      onUserSnapshot(response.user);
      if (!response.shortUrl) {
        throw new Error('Missing top-up checkout link');
      }
      setPendingReturnPurchase({
        purchaseType: 'top_up_10',
        baselinePurchasedCredits: Math.max(0, Number(user.purchasedCredits) || 0),
      });
      setReturnSyncMessage('Complete the payment in Razorpay and come back here. We will refresh your credits automatically.');
      openCheckout(response.shortUrl);
    } catch (error) {
      console.error('Failed to create checkout intent', error);
      setCheckoutError(getRequestErrorMessage(error, 'Could not prepare checkout right now. Please try again.'));
    } finally {
      setActiveCheckout(null);
    }
  };

  const beginMonthlySubscription = async () => {
    setCheckoutError(null);
    setReturnSyncMessage(null);
    setActiveCheckout('monthly_100');

    try {
      const response = await createMonthlySubscription(authToken);
      onUserSnapshot(response.user);
      if (!response.shortUrl) {
        throw new Error('Missing subscription checkout link');
      }
      setPendingReturnPurchase({
        purchaseType: 'monthly_100',
        baselinePurchasedCredits: Math.max(0, Number(user.purchasedCredits) || 0),
      });
      setReturnSyncMessage('Finish the Razorpay subscription checkout and come back to this tab. We will activate your cycle automatically.');
      openCheckout(response.shortUrl);
    } catch (error) {
      console.error('Failed to create monthly subscription', error);
      setCheckoutError(getRequestErrorMessage(error, 'Could not start the monthly subscription right now. Please try again.'));
    } finally {
      setActiveCheckout(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#dbe4fa] bg-[radial-gradient(circle_at_top_left,_rgba(47,86,192,0.16),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f5f8ff_45%,#eef4ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cad8fb] bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#3557ab]">
              <Sparkles className="h-3.5 w-3.5" />
              Pricing & Credits
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#17316d]">Manage credits before work gets blocked</h1>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
              New users start with {FREE_CREDITS_FOR_NEW_USERS} free credits. Upgrade to the monthly plan or add a top-up when your balance gets low.
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5570b5]">
              Checkout links are generated by the backend and attached to your account automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d6e2fb] bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="font-semibold text-[#1f3f87]">{creditOverview.totalAvailableCredits.toFixed(2)} credits available</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {hasMonthlyPlan
                ? `${creditOverview.includedRemainingCredits.toFixed(2)} cycle • ${creditOverview.topUpReserveCredits.toFixed(2)} reserve`
                : hasPendingSubscriptionSetup
                  ? 'Subscription checkout pending'
                  : 'Free balance'}
            </div>
          </div>
        </div>
      </section>

      {returnSyncMessage ? (
        <Card className={`rounded-[22px] border ${syncingAfterReturn ? 'border-blue-200 bg-blue-50' : 'border-[#dbe4fa] bg-white'}`}>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="text-sm font-medium text-[#21408b]">{returnSyncMessage}</div>
            {syncingAfterReturn ? (
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#4c67b7]">Syncing</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(creditOverview.isLow || creditOverview.isExhausted) ? (
        <Card className={`rounded-[24px] border ${creditOverview.isExhausted ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-2xl p-2 ${creditOverview.isExhausted ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-base font-black ${creditOverview.isExhausted ? 'text-rose-700' : 'text-amber-800'}`}>
                  {creditOverview.isExhausted ? 'Your credits are exhausted' : 'You are close to exhausting your credits'}
                </div>
                <p className={`mt-1 text-sm font-medium ${creditOverview.isExhausted ? 'text-rose-700' : 'text-amber-800'}`}>
                  {hasMonthlyPlan
                    ? `Your included 100-cycle credits are nearly gone. Once they hit zero, the top-up checkout will unlock.`
                    : `Start the monthly subscription for ${planPriceLabel} before your remaining balance runs out.`}
                </p>
                <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.12em] ${creditOverview.isExhausted ? 'text-rose-600' : 'text-amber-700'}`}>
                  Razorpay test mode subscription + checkout
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!hasMonthlyPlan ? (
                <Button
                  onClick={beginMonthlySubscription}
                  disabled={activeCheckout !== null || syncingAfterReturn}
                  className="rounded-xl bg-[#2F56C0] hover:bg-[#26479f]"
                >
                  {activeCheckout === 'monthly_100'
                    ? 'Preparing Subscription...'
                    : hasPendingSubscriptionSetup
                      ? 'Continue Subscription Setup'
                      : 'Start Monthly Subscription'}
                </Button>
              ) : null}
              <Button
                onClick={beginTopUpCheckout}
                disabled={activeCheckout !== null || syncingAfterReturn || !creditOverview.canBuyTopUp}
                variant="outline"
                className="rounded-xl border-[#9eb7ff] text-[#21408b]"
              >
                Add {TOP_UP_CREDITS} Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black text-[#17316d]">
              <Coins className="h-5 w-5 text-[#2F56C0]" />
              Credit Status
            </CardTitle>
            <CardDescription>Track what you have used, what is included, and how much remains.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <StatusTile
              label="Current plan"
              value={creditOverview.planLabel}
              helper={
                hasMonthlyPlan
                  ? `${MONTHLY_PLAN_CREDITS} credits every active billing cycle`
                  : hasPendingSubscriptionSetup
                    ? 'Razorpay checkout started but not activated yet'
                    : `${FREE_CREDITS_FOR_NEW_USERS} starter credits`
              }
            />
            <StatusTile
              label={hasMonthlyPlan ? 'Cycle balance' : 'Included balance'}
              value={creditOverview.includedRemainingCredits.toFixed(2)}
              helper={hasMonthlyPlan ? 'Unused monthly credits expire at cycle end' : 'Starter credits do not reset monthly'}
            />
            <StatusTile
              label="Top-up reserve"
              value={creditOverview.topUpReserveCredits.toFixed(2)}
              helper={
                hasMonthlyPlan
                  ? 'Overflow credits used only after the cycle balance hits zero'
                  : 'Stays at zero until you activate a monthly plan and later exhaust it'
              }
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black text-[#17316d]">
              <BadgeIndianRupee className="h-5 w-5 text-[#2F56C0]" />
              Recommended Plan
            </CardTitle>
            <CardDescription>The same plan is shown in INR for India and USD elsewhere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-[#cfe0ff] bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_100%)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#4c67b7]">Monthly Plan</div>
                  <div className="mt-2 text-2xl font-black text-[#17316d]">100 credits / month</div>
                  <div className="mt-2 text-sm font-medium text-slate-600">{planPriceLabel}</div>
                  {subscriptionStatus ? (
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Subscription status: {subscriptionStatus}
                    </div>
                  ) : null}
                </div>
                {hasMonthlyPlan ? (
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Active
                  </div>
                ) : null}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Best when you are filling forms regularly.</li>
                <li>Low-credit warnings will push users here before they get blocked.</li>
                <li>Unused monthly credits do not roll into the next billing cycle.</li>
                <li>Top-up unlocks only after the current monthly cycle balance reaches zero.</li>
                <li>The 10-credit top-up expires when the current monthly cycle ends.</li>
                <li>Monthly plan now opens a real Razorpay subscription checkout in test mode.</li>
                <li>Top-ups now open a user-linked Razorpay payment checkout for {topUpPriceLabel} and are granted after the `payment.captured` webhook lands.</li>
              </ul>
              <div className="mt-4 rounded-2xl border border-[#e6ecff] bg-[#f8fbff] px-4 py-3 text-sm text-slate-600">
                Automatic credit grants now depend on Razorpay webhooks and backend-linked payment metadata, not matching checkout email.
              </div>
              {checkoutError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {checkoutError}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  onClick={beginMonthlySubscription}
                  disabled={activeCheckout !== null || syncingAfterReturn || hasMonthlyPlan}
                  className="rounded-xl bg-[#2F56C0] hover:bg-[#26479f]"
                >
                  {activeCheckout === 'monthly_100'
                    ? 'Preparing Subscription...'
                    : hasMonthlyPlan
                      ? 'Subscription Active'
                      : hasPendingSubscriptionSetup
                        ? 'Continue Subscription Setup'
                        : 'Activate Monthly Subscription'}
                </Button>
                <Button
                  onClick={beginTopUpCheckout}
                  disabled={activeCheckout !== null || syncingAfterReturn || !creditOverview.canBuyTopUp}
                  variant="outline"
                  className="rounded-xl border-[#9eb7ff] text-[#21408b]"
                >
                  {activeCheckout === 'top_up_10' ? 'Preparing Checkout...' : `Add ${TOP_UP_CREDITS} Credits`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PlanCard
          title="New User Offer"
          subtitle="Get started"
          priceLabel="Free"
          description={`${FREE_CREDITS_FOR_NEW_USERS} free credits are included for every new user account.`}
          icon={<Sparkles className="h-5 w-5 text-[#2F56C0]" />}
        />
        <PlanCard
          title="Monthly Subscription"
          subtitle="Best for active users"
          priceLabel={planPriceLabel}
          description={`Get ${MONTHLY_PLAN_CREDITS} credits every billing cycle and renew them through a real Razorpay subscription.`}
          icon={<CreditCard className="h-5 w-5 text-[#2F56C0]" />}
        />
        <PlanCard
          title="Top-Up Pack"
          subtitle="Overflow once exhausted"
          priceLabel={topUpPriceLabel}
          description={`Add ${TOP_UP_CREDITS} overflow credits only after the active monthly cycle balance reaches zero, and use them before that same cycle ends.`}
          icon={<Coins className="h-5 w-5 text-[#2F56C0]" />}
        />
      </section>
    </div>
  );
};

function StatusTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[20px] border border-[#dce7ff] bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-3 text-2xl font-black text-[#17316d]">{value}</div>
      <div className="mt-2 text-sm font-medium text-slate-500">{helper}</div>
    </div>
  );
}

function PlanCard({
  title,
  subtitle,
  priceLabel,
  description,
  icon,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-[#dbe4fa] bg-[#f2f6ff] p-3">{icon}</div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{subtitle}</div>
        </div>
        <CardTitle className="text-xl font-black text-[#17316d]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-[#17316d]">{priceLabel}</div>
      </CardContent>
    </Card>
  );
}
