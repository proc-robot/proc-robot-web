import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { requireMember } from "@/lib/auth/session";
import { EMPTY_CUSTOMER } from "../schema";

export const metadata: Metadata = { title: "New customer" };

export default async function NewCustomerPage() {
  await requireMember();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="New customer"
        description="A company you quote for. Its address and tax ID appear on your quotations."
      />
      <SectionCard id="customer" title="Customer details">
        <CustomerForm mode="create" defaultValues={EMPTY_CUSTOMER} cancelHref="/customers" />
      </SectionCard>
    </div>
  );
}
