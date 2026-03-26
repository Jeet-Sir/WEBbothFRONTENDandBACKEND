"use client";

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  CalendarDays,
  Coins,
  ExternalLink,
  FileClock,
  FileText,
  Filter,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { fetchActivitySessionDetail, fetchActivitySessions } from '@/lib/api';
import {
  ActivityFilters,
  ActivitySessionDetailResponse,
  ActivitySessionsResponse,
  SessionStatus,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityProps {
  authToken: string;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  submitted: 'Submitted',
  abandoned: 'Abandoned',
  in_progress: 'In Progress',
};

const STATUS_CLASSES: Record<SessionStatus, string> = {
  submitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  abandoned: 'bg-rose-50 text-rose-700 border-rose-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatCredits(value: number): string {
  return `${value.toFixed(value >= 10 ? 1 : 2).replace(/\.0$/, '')} credits`;
}

function formatTokenCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDateTime(value?: string): string {
  if (!value) return 'Not available';

  try {
    return format(new Date(value), 'dd MMM yyyy, hh:mm a');
  } catch {
    return value;
  }
}

function safeHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const Activity: React.FC<ActivityProps> = ({ authToken }) => {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>({ page: 1, pageSize: 20 });
  const [activity, setActivity] = useState<ActivitySessionsResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ActivitySessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        page: 1,
        search: searchInput.trim() || undefined,
      }));
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchActivitySessions(authToken, filters)
      .then((response) => {
        if (cancelled) return;

        setActivity(response);
        setError(null);
        setSelectedSessionId((current) => {
          if (current && response.sessions.some((session) => session.id === current)) {
            return current;
          }
          return response.sessions[0]?.id || null;
        });
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setActivity(null);
        setSelectedSessionId(null);
        setDetail(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load activity.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, filters]);

  useEffect(() => {
    if (!selectedSessionId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    fetchActivitySessionDetail(authToken, selectedSessionId)
      .then((response) => {
        if (!cancelled) {
          setDetail(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, selectedSessionId]);

  const summary = activity?.summary;
  const selectedSession = detail?.session || null;
  const chartData = selectedSession
    ? [
        ...selectedSession.agentLogs.map((agent) => ({
          name: agent.agentName.replace(/_/g, ' '),
          credits: agent.creditsUsed,
        })),
        ...selectedSession.documents.map((document) => ({
          name: document.documentName,
          credits: document.creditsUsed,
        })),
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#dbe4fa] bg-[radial-gradient(circle_at_top_left,_rgba(47,86,192,0.16),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f5f8ff_45%,#eef4ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cad8fb] bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#3557ab]">
              <Sparkles className="h-3.5 w-3.5" />
              My Activity
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#17316d]">Track every form fill and every credit burn</h1>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
              Review form-filling history, compare model usage, and inspect how credits were distributed across agents and
              document processing.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d6e2fb] bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="font-semibold text-[#1f3f87]">Route ready for extension linking</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">/dashboard</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<FileClock className="h-5 w-5 text-[#2F56C0]" />}
          label="Total Forms Filled"
          value={summary ? String(summary.totalFormsFilled) : '--'}
          helper="Submitted sessions"
        />
        <SummaryCard
          icon={<Coins className="h-5 w-5 text-[#2F56C0]" />}
          label="Total Credits Used"
          value={summary ? formatCredits(summary.totalCreditsUsed) : '--'}
          helper="Across tracked activity"
        />
        <SummaryCard
          icon={<FileText className="h-5 w-5 text-[#2F56C0]" />}
          label="Docs Uploaded"
          value={summary ? String(summary.docsUploaded) : '--'}
          helper="Current vault count"
        />
        <SummaryCard
          icon={<CalendarDays className="h-5 w-5 text-[#2F56C0]" />}
          label="Credits This Month"
          value={summary ? formatCredits(summary.creditsThisMonth) : '--'}
          helper="Current billing period"
        />
      </section>

      <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-black text-[#17316d]">
            <Filter className="h-5 w-5 text-[#2F56C0]" />
            Filters
          </CardTitle>
          <CardDescription>Search by form name or URL, then narrow down by time, category, status, or model.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search form title or URL"
                className="pl-9"
              />
            </div>
          </div>

          <FilterSelect
            value={filters.status || 'all'}
            placeholder="All statuses"
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                status: value === 'all' ? undefined : (value as SessionStatus),
              }))
            }
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'abandoned', label: 'Abandoned' },
              { value: 'in_progress', label: 'In Progress' },
            ]}
          />

          <FilterSelect
            value={filters.examCategory || 'all'}
            placeholder="All categories"
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                examCategory: value === 'all' ? undefined : value,
              }))
            }
            options={[
              { value: 'all', label: 'All categories' },
              ...(activity?.availableCategories || []).map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />

          <FilterSelect
            value={filters.modelName || 'all'}
            placeholder="All models"
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                modelName: value === 'all' ? undefined : value,
              }))
            }
            options={[
              { value: 'all', label: 'All models' },
              ...(activity?.availableModels || []).map((model) => ({
                value: model,
                label: model,
              })),
            ]}
          />

          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                dateFrom: event.target.value || undefined,
              }))
            }
          />

          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                dateTo: event.target.value || undefined,
              }))
            }
          />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#17316d]">Activity Feed</CardTitle>
                <CardDescription>Recent form-fill sessions, newest first.</CardDescription>
              </div>
              {activity ? (
                <div className="text-sm font-semibold text-slate-500">
                  {activity.total === 0
                    ? 'No sessions yet'
                    : `Showing ${(activity.page - 1) * activity.pageSize + 1}-${Math.min(
                        activity.page * activity.pageSize,
                        activity.total
                      )} of ${activity.total}`}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#cad8fb] bg-[#f8faff]">
                <Loader2 className="h-6 w-6 animate-spin text-[#2F56C0]" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">{error}</div>
            ) : activity && activity.sessions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {activity.sessions.map((session) => {
                    const isSelected = session.id === selectedSessionId;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full rounded-[22px] border p-5 text-left transition-all ${
                          isSelected
                            ? 'border-[#8eb0ff] bg-[#f5f8ff] shadow-[0_10px_24px_rgba(47,86,192,0.12)]'
                            : 'border-[#e4ebfb] bg-white hover:border-[#bfd1ff] hover:bg-[#fbfcff]'
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-lg font-black text-[#17316d]">{session.formTitle}</div>
                              <div className="text-sm font-medium text-slate-500">
                                {session.websiteName} • {safeHostLabel(session.formUrl)}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-[#c9d7fb] bg-[#eef3ff] text-[#234791]">
                                {session.examCategory}
                              </Badge>
                              <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[session.status]}`}>
                                {STATUS_LABELS[session.status]}
                              </div>
                              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                                {session.modelName}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-500 lg:text-right">
                            <div className="font-semibold text-[#17316d]">{formatCredits(session.creditsUsed)}</div>
                            <div>{formatDateTime(session.submittedAt || session.updatedAt)}</div>
                            <div>{formatTokenCount(session.totalTokens)} tokens</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 border-t border-[#e8eefb] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">20 items per page with server-side pagination controls.</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={(activity.page || 1) <= 1}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: Math.max(1, (current.page || 1) - 1),
                        }))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!activity.hasMore}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: (current.page || 1) + 1,
                        }))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#cad8fb] bg-[#f8faff] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <FileClock className="h-6 w-6 text-[#2F56C0]" />
                </div>
                <h3 className="mt-4 text-lg font-black text-[#17316d]">No form sessions tracked yet</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Once the extension starts logging form fills, this feed will show searchable history, statuses, and per-session
                  credits.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card rounded-[24px] border-[#dbe4fa]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black text-[#17316d]">Session Detail</CardTitle>
            <CardDescription>Credit distribution, token counts, and related events for the selected session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {detailLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#cad8fb] bg-[#f8faff]">
                <Loader2 className="h-6 w-6 animate-spin text-[#2F56C0]" />
              </div>
            ) : selectedSession ? (
              <>
                <div className="rounded-[22px] border border-[#dce6fe] bg-[#f7f9ff] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-[#17316d]">{selectedSession.formTitle}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">{selectedSession.websiteName}</p>
                    </div>
                    <a
                      href={selectedSession.formUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#cad8fb] bg-white text-[#2F56C0] transition-colors hover:bg-[#eef3ff]"
                      aria-label="Open original form URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailStat label="Status" value={STATUS_LABELS[selectedSession.status]} />
                    <DetailStat label="Model" value={selectedSession.modelName} />
                    <DetailStat label="Submitted" value={formatDateTime(selectedSession.submittedAt || selectedSession.updatedAt)} />
                    <DetailStat label="Total Session Credits" value={formatCredits(selectedSession.creditsUsed)} />
                    <DetailStat label="Total Tokens" value={formatTokenCount(selectedSession.totalTokens)} />
                    <DetailStat label="Agents Involved" value={String(selectedSession.agentCount)} />
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#e3ebfd] bg-white p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#3557ab]">Credits Breakdown</div>
                  {chartData.length > 0 ? (
                    <ChartContainer
                      className="h-[220px] w-full"
                      config={{
                        credits: {
                          label: 'Credits',
                          color: '#2F56C0',
                        },
                      }}
                    >
                      <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke="#edf2ff" />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={96}
                          tickLine={false}
                          axisLine={false}
                          style={{ fontSize: 12, fill: '#64748b' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                        <Bar dataKey="credits" fill="var(--color-credits)" radius={8} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#cad8fb] bg-[#f8faff] p-5 text-sm font-medium text-slate-500">
                      No per-agent credit logs were recorded for this session yet.
                    </div>
                  )}
                </div>

                <div className="rounded-[22px] border border-[#e3ebfd] bg-white p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#3557ab]">Per-Agent Usage</div>
                  <div className="space-y-3">
                    {selectedSession.agentLogs.length > 0 ? (
                      selectedSession.agentLogs.map((agent) => (
                        <div key={agent.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold capitalize text-[#17316d]">{agent.agentName.replace(/_/g, ' ')}</div>
                              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{agent.modelName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-[#17316d]">{formatCredits(agent.creditsUsed)}</div>
                              <div className="text-xs text-slate-500">{formatTokenCount(agent.totalTokens)} tokens</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-medium text-slate-500">No agent logs recorded yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#e3ebfd] bg-white p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#3557ab]">Document Processing</div>
                  {selectedSession.documents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSession.documents.map((document) => (
                        <div key={document.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div>
                            <div className="font-bold text-[#17316d]">{document.documentName}</div>
                            <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              {document.eventType.replace(/_/g, ' ')} • {document.modelName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#17316d]">{formatCredits(document.creditsUsed)}</div>
                            <div className="text-xs text-slate-500">{formatTokenCount(document.totalTokens)} tokens</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-slate-500">No documents were logged for this session.</div>
                  )}
                </div>

                <div className="rounded-[22px] border border-[#e3ebfd] bg-white p-4">
                  <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#3557ab]">Related Credit Events</div>
                  <div className="space-y-3">
                    {(detail?.creditEvents || []).length > 0 ? (
                      detail?.creditEvents.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-[#17316d]">{event.agentName.replace(/_/g, ' ')}</div>
                              <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                                {event.eventType.replace(/_/g, ' ')} • {formatDateTime(event.createdAt)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-[#17316d]">{formatCredits(event.creditsUsed)}</div>
                              <div className="text-xs text-slate-500">{formatTokenCount(event.totalTokens)} tokens</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-medium text-slate-500">No credit events were found for this session.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#cad8fb] bg-[#f8faff] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Coins className="h-6 w-6 text-[#2F56C0]" />
                </div>
                <h3 className="mt-4 text-lg font-black text-[#17316d]">Select a session to inspect it</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  The detail view will show agent-level credit usage, document processing costs, and session tokens.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

function SummaryCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card className="dashboard-card rounded-[24px] border-[#dbe4fa] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-3 text-2xl font-black tracking-tight text-[#17316d]">{value}</div>
          <div className="mt-2 text-sm font-medium text-slate-500">{helper}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dbe4fa] bg-[#f2f6ff]">{icon}</div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value,
  placeholder,
  onChange,
  options,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dbe4fa] bg-white px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#17316d]">{value}</div>
    </div>
  );
}
