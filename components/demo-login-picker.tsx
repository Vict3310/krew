"use client";

const demoAccounts = [
  { label: "Ada Worker", identifier: "ada.worker@demo.local", password: "Ada@12345" },
  { label: "Chidi Organizer", identifier: "chidi.organizer@demo.local", password: "Chidi@12345" },
  { label: "Krew Admin", identifier: "admin@demo.local", password: "Admin@12345" },
];

export default function QuickAccessAccounts() {
  const fillQuickAccessAccount = (identifier: string, password: string) => {
    const identifierField = document.getElementById("identifier") as HTMLInputElement | null;
    const passwordField = document.getElementById("password") as HTMLInputElement | null;
    if (identifierField) identifierField.value = identifier;
    if (passwordField) passwordField.value = password;
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#E6E7EF] bg-[#F9F9FC] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Quick access</p>
        <span className="rounded-full border border-[#E0E1EA] bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5B3DF5]">Staff portal</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {demoAccounts.map((account) => (
          <button
            key={account.label}
            type="button"
            onClick={() => fillQuickAccessAccount(account.identifier, account.password)}
            className="rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-left text-sm font-medium text-[#141B41] transition hover:border-[#A9A3E8] hover:bg-[#F1F0FF]"
          >
            {account.label}
          </button>
        ))}
      </div>
    </div>
  );
}
