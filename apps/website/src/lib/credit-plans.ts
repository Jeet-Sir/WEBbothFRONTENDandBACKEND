import { ActivitySummary, CreditPlan, UserProfile } from './types';

export const FREE_CREDITS_FOR_NEW_USERS = 15;
export const MONTHLY_PLAN_CREDITS = 100;
export const TOP_UP_CREDITS = 10;
export const MONTHLY_PLAN_PRICE_INR = 155;
export const TOP_UP_PRICE_INR = 20;
export const USD_TO_INR = 94.8;
export const MONTHLY_PLAN_PRICE_USD = Number((MONTHLY_PLAN_PRICE_INR / USD_TO_INR).toFixed(2));
export const TOP_UP_PRICE_USD = Number((TOP_UP_PRICE_INR / USD_TO_INR).toFixed(2));
export const RAZORPAY_MONTHLY_PLAN_URL =
  process.env.NEXT_PUBLIC_RAZORPAY_MONTHLY_PLAN_URL || 'https://rzp.io/rzp/xV96uydQ';
export const RAZORPAY_TOP_UP_URL =
  process.env.NEXT_PUBLIC_RAZORPAY_TOP_UP_URL || RAZORPAY_MONTHLY_PLAN_URL;

export interface CreditOverview {
  plan: CreditPlan;
  planLabel: string;
  planState: 'free' | 'subscription_setup' | 'monthly_active';
  baseCredits: number;
  purchasedCredits: number;
  usedCredits: number;
  remainingCredits: number;
  includedRemainingCredits: number;
  topUpReserveCredits: number;
  totalAvailableCredits: number;
  hasPendingSubscriptionSetup: boolean;
  canBuyTopUp: boolean;
  lowCreditThreshold: number;
  isLow: boolean;
  isExhausted: boolean;
  primaryCurrency: 'USD' | 'INR';
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'authenticated', 'pending']);

function hasActiveMonthlyPlan(user: UserProfile): boolean {
  const status = user.subscriptionStatus?.toLowerCase();
  const cycleEnd = user.subscriptionCurrentEnd || user.creditPlanExpiresAt;

  if (status && !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    return false;
  }

  if (cycleEnd) {
    return new Date(cycleEnd).getTime() > Date.now();
  }

  return user.creditPlan === 'monthly_100';
}

function hasPendingSubscriptionSetup(user: UserProfile): boolean {
  return user.subscriptionStatus === 'created' && Boolean(user.razorpaySubscriptionId || user.razorpaySubscriptionShortUrl);
}

export function getPrimaryCurrency(countryCode?: string): 'USD' | 'INR' {
  return countryCode?.toUpperCase() === 'IN' ? 'INR' : 'USD';
}

export function formatCurrency(value: number, currency: 'USD' | 'INR'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getPlanPriceLabel(countryCode?: string): string {
  const primaryCurrency = getPrimaryCurrency(countryCode);
  const primary =
    primaryCurrency === 'INR'
      ? formatCurrency(MONTHLY_PLAN_PRICE_INR, 'INR')
      : formatCurrency(MONTHLY_PLAN_PRICE_USD, 'USD');
  const secondary =
    primaryCurrency === 'INR'
      ? formatCurrency(MONTHLY_PLAN_PRICE_USD, 'USD')
      : formatCurrency(MONTHLY_PLAN_PRICE_INR, 'INR');

  return `${primary} • ${secondary}`;
}

export function getTopUpPriceLabel(countryCode?: string): string {
  const primaryCurrency = getPrimaryCurrency(countryCode);
  const primary =
    primaryCurrency === 'INR'
      ? formatCurrency(TOP_UP_PRICE_INR, 'INR')
      : formatCurrency(TOP_UP_PRICE_USD, 'USD');
  const secondary =
    primaryCurrency === 'INR'
      ? formatCurrency(TOP_UP_PRICE_USD, 'USD')
      : formatCurrency(TOP_UP_PRICE_INR, 'INR');

  return `${primary} • ${secondary}`;
}

function getValidPurchasedCredits(user: UserProfile): number {
  const purchasedCredits = Math.max(0, Number(user.purchasedCredits) || 0);
  if (!purchasedCredits || !user.purchasedCreditsExpiresAt) {
    return 0;
  }

  const expiresAt = new Date(user.purchasedCreditsExpiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return 0;
  }

  return purchasedCredits;
}

export function getCreditOverview(user: UserProfile, summary?: ActivitySummary | null): CreditOverview {
  const monthlyActive = hasActiveMonthlyPlan(user);
  const pendingSetup = hasPendingSubscriptionSetup(user);
  const plan: CreditPlan = monthlyActive ? 'monthly_100' : 'free';
  const purchasedCredits = getValidPurchasedCredits(user);
  const baseCredits =
    monthlyActive
      ? MONTHLY_PLAN_CREDITS
      : Math.max(0, Number(user.freeCreditsAwarded) || FREE_CREDITS_FOR_NEW_USERS);
  const usedCredits = Math.max(
    0,
    monthlyActive ? summary?.creditsCurrentCycle ?? summary?.creditsThisMonth ?? 0 : summary?.totalCreditsUsed || 0
  );
  const includedRemainingCredits = Math.max(0, Number((baseCredits - usedCredits).toFixed(2)));
  const totalAvailableCredits = Math.max(0, Number((includedRemainingCredits + purchasedCredits).toFixed(2)));
  const remainingCredits = totalAvailableCredits;
  const lowCreditThreshold = Math.max(5, Math.ceil(baseCredits * 0.2));
  const isLow = monthlyActive
    ? includedRemainingCredits <= lowCreditThreshold && totalAvailableCredits > 0 && purchasedCredits <= 0
    : remainingCredits <= lowCreditThreshold && remainingCredits > 0;
  const isExhausted = totalAvailableCredits <= 0;

  return {
    plan,
    planLabel: monthlyActive ? 'Monthly 100' : pendingSetup ? 'Subscription Setup' : 'Free',
    planState: monthlyActive ? 'monthly_active' : pendingSetup ? 'subscription_setup' : 'free',
    baseCredits,
    purchasedCredits,
    usedCredits,
    remainingCredits,
    includedRemainingCredits,
    topUpReserveCredits: purchasedCredits,
    totalAvailableCredits,
    hasPendingSubscriptionSetup: pendingSetup,
    canBuyTopUp: monthlyActive && isExhausted,
    lowCreditThreshold,
    isLow,
    isExhausted,
    primaryCurrency: getPrimaryCurrency(user.countryCode),
  };
}
