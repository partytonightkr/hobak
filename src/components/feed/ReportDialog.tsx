"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "VIOLENCE", label: "Violence or threats" },
  { value: "NUDITY", label: "Inappropriate content" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
];

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export function ReportDialog({ isOpen, onClose, postId }: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await api.post(`/posts/${postId}/report`, {
        reason,
        description: details.trim() || undefined,
      });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDetails("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report content">
      {submitted ? (
        <div className="text-center py-4">
          <svg className="mx-auto h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-surface-900 dark:text-surface-50">Report submitted</p>
          <p className="mt-1 text-xs text-surface-500">Thank you. Our team will review this report.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Why are you reporting this content?
          </p>
          <div className="mt-3 space-y-2">
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-3 cursor-pointer rounded-lg p-2 hover:bg-surface-50 dark:hover:bg-surface-800">
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-700 dark:text-surface-300">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === "OTHER" && (
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide more details..."
              className="mt-3 block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              rows={3}
              maxLength={500}
            />
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleSubmit} isLoading={isSubmitting} disabled={!reason}>
              Submit report
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
