/**
 * SummaryBanner Component
 *
 * Displays a daily email processing summary
 * Per T038 task specification:
 * - Template: 今天共处理 X 封邮件，其中 Y 件需要你重点关注
 * - Celebratory variant when reviewCount = 0
 * - Appropriate color coding (blue for normal, green for celebratory)
 *
 * @module renderer/components/reports/SummaryBanner
 */

interface SummaryBannerProps {
  totalEmails: number;
  reviewCount: number;
}

export function SummaryBanner({ totalEmails, reviewCount }: SummaryBannerProps) {
  const isCelebratory = reviewCount === 0;

  return (
    <div
      className={`
        p-4 rounded-lg
        ${isCelebratory ? 'bg-green-50' : 'bg-blue-50'}
      `}
    >
      {isCelebratory ? (
        <p className="text-green-900 font-medium text-center">
          太棒了！所有项目都准确
        </p>
      ) : (
        <p className="text-blue-900">
          今天共处理 {totalEmails} 封邮件，其中 {reviewCount} 件需要你重点关注。
        </p>
      )}
    </div>
  );
}
