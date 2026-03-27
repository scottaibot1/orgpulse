import { headers } from "next/headers";
import Link from "next/link";
import { Download, Monitor, Smartphone, Apple, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

function detectOS(ua: string): "mac" | "windows" | "ios" | "android" | "unknown" {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  return "unknown";
}

// Replace with your actual GitHub releases URL once you push a release
const GITHUB_RELEASES = "https://github.com/scottaibot1/orgrise/releases/latest";
const MAC_DMG = `${GITHUB_RELEASES}/download/OrgRise-universal.dmg`;
const WIN_EXE = `${GITHUB_RELEASES}/download/OrgRise-Setup.exe`;

export default async function DownloadPage() {
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const os = detectOS(ua);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">OR</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Download OrgRise</h1>
          <p className="text-slate-500 mt-2">
            Native desktop app for Mac and Windows, or install directly from your browser on mobile.
          </p>
        </div>

        {/* Highlighted download for detected OS */}
        {(os === "mac" || os === "windows") && (
          <div className="bg-indigo-600 text-white rounded-2xl p-6 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75">
                  Recommended for your device
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {os === "mac" ? "OrgRise for Mac" : "OrgRise for Windows"}
                </p>
                <p className="text-sm opacity-75 mt-0.5">
                  {os === "mac"
                    ? "Universal binary · Intel + Apple Silicon"
                    : "Windows 10 / 11 · 64-bit installer"}
                </p>
              </div>
            </div>
            <a
              href={os === "mac" ? MAC_DMG : WIN_EXE}
              className="flex items-center gap-2 bg-white text-indigo-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm flex-shrink-0"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        )}

        {/* All platforms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mac */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Apple className="h-6 w-6 text-slate-700" />
              <div>
                <p className="font-semibold text-slate-800">macOS</p>
                <p className="text-xs text-slate-400">Intel + Apple Silicon</p>
              </div>
            </div>
            <a
              href={MAC_DMG}
              className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-medium py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Download .dmg
            </a>
          </div>

          {/* Windows */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="h-6 w-6 text-slate-700" />
              <div>
                <p className="font-semibold text-slate-800">Windows</p>
                <p className="text-xs text-slate-400">Windows 10 / 11</p>
              </div>
            </div>
            <a
              href={WIN_EXE}
              className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-medium py-2.5 rounded-xl hover:bg-slate-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Download .exe
            </a>
          </div>

          {/* iPhone / iPad */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="h-6 w-6 text-slate-700" />
              <div>
                <p className="font-semibold text-slate-800">iPhone / iPad</p>
                <p className="text-xs text-slate-400">Add to Home Screen</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">
              Open OrgRise in <strong>Safari</strong>, tap the{" "}
              <strong>Share</strong> button, then tap{" "}
              <strong>Add to Home Screen</strong>.
            </div>
          </div>

          {/* Android */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="h-6 w-6 text-slate-700" />
              <div>
                <p className="font-semibold text-slate-800">Android</p>
                <p className="text-xs text-slate-400">Install as app</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">
              Open OrgRise in <strong>Chrome</strong>, tap the{" "}
              <strong>three-dot menu</strong>, then tap{" "}
              <strong>Add to Home screen</strong>.
            </div>
          </div>
        </div>

        {/* Auto-update note */}
        <p className="text-center text-xs text-slate-400 mt-8">
          Desktop apps update automatically when new versions are released.{" "}
          <Link href="/" className="underline hover:text-slate-600">
            Use in browser instead
          </Link>
        </p>
      </div>
    </div>
  );
}
