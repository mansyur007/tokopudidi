import { SellerShell } from '@/components/seller/SellerShell';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}
