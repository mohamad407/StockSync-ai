import AuthGate from "@/components/AuthGate";
import StockSyncApp from "@/components/StockSyncApp";

export default function HomePage() {
  return (
    <AuthGate>
      <StockSyncApp />
    </AuthGate>
  );
}
