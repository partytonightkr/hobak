"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatCount } from "@/lib/utils";
import api from "@/lib/api";

interface DayCount {
  date: string;
  count: number;
}

interface TopPost {
  id: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  engagementScore: number;
}

interface ProfileAnalytics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  followersCount: number;
  followingCount: number;
  engagementRate: number;
  postsByDay: DayCount[];
  likesByDay: DayCount[];
  followerGrowth: DayCount[];
  topPosts: TopPost[];
}

interface AnalyticsDashboardProps {
  days?: number;
}

export function AnalyticsDashboard({ days = 30 }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(days);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/analytics/profile?days=${selectedPeriod}`);
        setAnalytics(data);
      } catch {
        setError("Failed to load analytics. This feature is available for premium subscribers.");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-surface-500 dark:text-surface-400">{error}</p>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
          Analytics
        </h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === period
                  ? "bg-primary-500 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              }`}
            >
              {period}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Posts" value={analytics.totalPosts} />
        <StatCard label="Likes" value={analytics.totalLikes} />
        <StatCard label="Comments" value={analytics.totalComments} />
        <StatCard label="Shares" value={analytics.totalShares} />
        <StatCard label="Followers" value={analytics.followersCount} />
        <StatCard
          label="Engagement"
          value={`${analytics.engagementRate}%`}
          isText
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-medium text-surface-900 dark:text-surface-50 mb-4">
            Posts per Day
          </h3>
          <BarChart data={analytics.postsByDay} color="bg-primary-500" />
        </Card>
        <Card>
          <h3 className="font-medium text-surface-900 dark:text-surface-50 mb-4">
            Likes Received
          </h3>
          <BarChart data={analytics.likesByDay} color="bg-red-500" />
        </Card>
        <Card>
          <h3 className="font-medium text-surface-900 dark:text-surface-50 mb-4">
            New Followers
          </h3>
          <BarChart data={analytics.followerGrowth} color="bg-green-500" />
        </Card>
      </div>

      {/* Top posts */}
      {analytics.topPosts.length > 0 && (
        <Card>
          <h3 className="font-medium text-surface-900 dark:text-surface-50 mb-4">
            Top Performing Posts
          </h3>
          <div className="space-y-3">
            {analytics.topPosts.map((post, index) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-900 dark:text-surface-100 line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-surface-500">
                    <span>{formatCount(post.likesCount)} likes</span>
                    <span>{formatCount(post.commentsCount)} comments</span>
                    <span>{formatCount(post.sharesCount)} shares</span>
                    <span className="font-medium text-primary-500">
                      Score: {post.engagementScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  isText,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
        {isText ? value : formatCount(value as number)}
      </p>
      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
        {label}
      </p>
    </Card>
  );
}

/**
 * Simple bar chart using CSS. For production, consider recharts or chart.js.
 */
function BarChart({ data, color }: { data: DayCount[]; color: string }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-8">
        No data for this period
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            className={`w-full rounded-t ${color} transition-all min-h-[2px]`}
            style={{ height: `${(d.count / maxCount) * 100}%` }}
          />
          {/* Tooltip on hover */}
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}
