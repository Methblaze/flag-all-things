import { TabStack } from '@/components/header';

export default function ScanStack() {
  // Scan is camera-first: an inline title with the brand mark (BrandTitle, set in index.tsx), not a large title.
  return <TabStack title="Food-Flag" large={false} />;
}
