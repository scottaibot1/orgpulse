"use client";

export default function WorkspacesError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-lg w-full">
        <h2 className="text-white font-bold text-lg mb-2">Something went wrong</h2>
        <p className="text-red-400 text-sm font-mono break-all">{error.message}</p>
        {error.digest && <p className="text-slate-500 text-xs mt-2">Digest: {error.digest}</p>}
      </div>
    </div>
  );
}
